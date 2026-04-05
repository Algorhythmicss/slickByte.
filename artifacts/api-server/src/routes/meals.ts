import { createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Prisma } from "@prisma/client";
import { AnalyzeMealBody, AnalyzeMealResponse, GetMealInsightBody } from "@workspace/api-zod";
import { isDatabaseConfigured, prisma } from "../lib/prisma";

const router: IRouter = Router();

const GEMINI_KEY_PLACEHOLDERS = new Set(["your_actual_key_here", "changeme", "your_key_here"]);
const DEFAULT_PORTION = "medium";
const DEFAULT_PLATE_SIZE = "medium_plate";
const CACHE_NOTE = "Based on a similar meal analyzed earlier";
const DAILY_ANALYZE_LIMIT = 5;
const RATE_LIMIT_ERROR = "rate_limit_exceeded";
const CALORIE_MISMATCH_THRESHOLD = 0.2;

type AnalyzeMealResponseType = ReturnType<typeof AnalyzeMealResponse.parse>;
type Portion = "small" | "medium" | "large";
type PlateSize = "small_plate" | "medium_plate" | "large_plate";
type CachedAnalyzeMealResponse = AnalyzeMealResponseType & {
  cached?: boolean;
  note?: string;
};
type MealAnalysisReview = {
  analysis: AnalyzeMealResponseType | null;
  validationIssues: string[];
};

const ANALYZE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  required: [
    "foodName",
    "calories",
    "confidence",
    "quickInsight",
    "macros",
    "healthScore",
    "suggestions",
    "ingredients",
  ],
  properties: {
    foodName: { type: SchemaType.STRING },
    calories: { type: SchemaType.NUMBER },
    confidence: {
      type: SchemaType.STRING,
      enum: ["high", "medium", "low"],
    },
    quickInsight: { type: SchemaType.STRING },
    macros: {
      type: SchemaType.OBJECT,
      required: ["protein", "carbs", "fats", "fiber"],
      properties: {
        protein: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        fats: { type: SchemaType.NUMBER },
        fiber: { type: SchemaType.NUMBER },
      },
    },
    healthScore: { type: SchemaType.NUMBER },
    suggestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    ingredients: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
} as const;

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey || GEMINI_KEY_PLACEHOLDERS.has(apiKey)) {
    throw new Error("GEMINI_API_KEY environment variable is missing or still set to a placeholder value.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: ANALYZE_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
     
      temperature: 0.2,
      topP: 0.8,
      topK: 32,
    },
  });
}

function isGeminiQuotaError(err: unknown) {
  if (!err || typeof err !== "object") {
    return false;
  }

  const maybeError = err as {
    status?: number;
    message?: string;
  };

  return (
    maybeError.status === 429 &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("Quota exceeded")
  );
}

function sendMealError(req: Request, res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof Error && err.message.includes("GEMINI_API_KEY")) {
    req.log.error({ err }, "Gemini API key is not configured");
    res.status(500).json({
      error: "config_error",
      message: "Gemini API key is missing or invalid in artifacts/api-server/.env",
    });
    return;
  }

  if (isGeminiQuotaError(err)) {
    req.log.error({ err }, "Gemini API quota exceeded");
    res.status(429).json({
      error: "ai_quota_exceeded",
      message: "Meal analysis is temporarily unavailable because the Gemini API quota has been exceeded. Please try again later.",
    });
    return;
  }

  req.log.error({ err }, fallbackMessage);
  res.status(500).json({ error: "server_error", message: fallbackMessage });
}

const ANALYZE_SYSTEM_PROMPT = `You are an expert nutritionist AI. Analyze the meal image carefully.

IMPORTANT:
- The user has specified portion size and plate size.
- Use plate size as a scale reference to estimate quantity.
- Do NOT assume small portions unless clearly visible.
- Be realistic and slightly conservative in calorie estimation.
- Ensure macros are internally consistent with calories:
  calories ≈ (protein*4 + carbs*4 + fats*9)

Return ONLY valid JSON.

Double-check:
- portion size estimation
- macro consistency
- ingredient plausibility

Response format:
{
  "foodName": "string - name of the dish/food",
  "calories": number - estimated calories,
  "confidence": "high" | "medium" | "low",
  "quickInsight": "string - one short phrase like 'High carb, moderate protein' or 'Balanced macros, low fat'",
  "macros": {
    "protein": number in grams,
    "carbs": number in grams,
    "fats": number in grams,
    "fiber": number in grams
  },
  "healthScore": number from 1-10,
  "suggestions": ["array of 2-3 specific health tips for this meal"],
  "ingredients": ["array of main detected ingredients"]
}`;

const INSIGHT_PROMPTS: Record<string, string> = {
  protein_breakdown: `Analyze the protein content of this meal in detail. Explain the protein sources, quality, completeness of amino acid profile, and how it contributes to muscle maintenance or growth. Be specific and educational but concise.`,
  make_healthier: `Suggest specific, practical ways to make this meal healthier. Focus on ingredient swaps, portion adjustments, or additions that would significantly improve the nutritional profile without completely changing the dish.`,
  fat_loss: `Evaluate this meal specifically for fat loss goals. Analyze its satiety index, caloric density, protein-to-calorie ratio, and explain whether it supports or hinders fat loss. Give specific actionable advice.`,
};

function hashImage(imageBase64: string) {
  return createHash("sha256").update(imageBase64).digest("hex");
}

function getClientIdentifier(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    const [firstHop] = forwardedFor.split(",");
    if (firstHop?.trim()) {
      return firstHop.trim();
    }
  }

  if (Array.isArray(forwardedFor)) {
    const firstHop = forwardedFor[0]?.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  return req.ip || "anonymous";
}

function getUserKey(req: Request) {
  return createHash("sha256").update(getClientIdentifier(req)).digest("hex");
}

function getStartOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizePrompt(prompt?: string) {
  return prompt?.trim() ?? "";
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanStringList(values: string[], minimumLength = 1) {
  const cleaned = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (cleaned.length < minimumLength) {
    return null;
  }

  return cleaned;
}

function buildAnalyzeUserMessage(prompt: string, portion: Portion, plateSize: PlateSize) {
  const lines = [
    "Analyze this meal and provide nutritional information as JSON.",
    `User-selected portion size: ${portion}.`,
    `User-selected plate size: ${plateSize}.`,
    "Use the plate size as a scale reference for the serving volume.",
    "Prefer realistic serving sizes and avoid underestimating calories.",
  ];

  if (prompt) {
    lines.push(`Additional user context: "${prompt}"`);
  }

  lines.push("Double-check that calories stay internally consistent with protein, carbs, and fats.");

  return lines.join("\n");
}

function calculateMacroCalories(protein: number, carbs: number, fats: number) {
  return roundToOneDecimal(protein * 4 + carbs * 4 + fats * 9);
}

function getCaloriesMismatchRatio(statedCalories: number, macroCalories: number) {
  return Math.abs(statedCalories - macroCalories) / Math.max(statedCalories, macroCalories, 1);
}

function buildRefinementUserMessage(
  prompt: string,
  portion: Portion,
  plateSize: PlateSize,
  previousResponse: string,
  validationIssues: string[],
) {
  const lines = [
    "Refine the previous meal analysis and return corrected JSON only.",
    `User-selected portion size: ${portion}.`,
    `User-selected plate size: ${plateSize}.`,
    "Re-check the image carefully and correct any weak, inconsistent, or implausible values.",
    `Validation issues to fix: ${validationIssues.join("; ")}.`,
  ];

  if (prompt) {
    lines.push(`Additional user context: "${prompt}"`);
  }

  lines.push("Previous response draft:");
  lines.push(previousResponse);
  lines.push("Return only valid JSON that matches the required response format.");

  return lines.join("\n");
}

function reviewMealAnalysis(raw: unknown): MealAnalysisReview {
  const parsed = AnalyzeMealResponse.safeParse(raw);

  if (!parsed.success) {
    return {
      analysis: null,
      validationIssues: ["missing_or_invalid_fields"],
    };
  }

  const validationIssues: string[] = [];
  const foodName = parsed.data.foodName.trim();
  const quickInsight = parsed.data.quickInsight.trim();
  const suggestions = cleanStringList(parsed.data.suggestions, 1);
  const ingredients = cleanStringList(parsed.data.ingredients, 1);

  if (!foodName || !quickInsight || !suggestions || !ingredients) {
    validationIssues.push("missing_or_invalid_fields");
  }

  const protein = roundToOneDecimal(parsed.data.macros.protein);
  const carbs = roundToOneDecimal(parsed.data.macros.carbs);
  const fats = roundToOneDecimal(parsed.data.macros.fats);
  const fiber = roundToOneDecimal(parsed.data.macros.fiber);
  const statedCalories = roundToOneDecimal(parsed.data.calories);
  const macroCalories = calculateMacroCalories(protein, carbs, fats);

  if (getCaloriesMismatchRatio(statedCalories, macroCalories) > CALORIE_MISMATCH_THRESHOLD) {
    validationIssues.push(
      `calories_vs_macros_mismatch (stated ${statedCalories}, expected ${macroCalories})`,
    );
  }

  if (parsed.data.confidence === "low") {
    validationIssues.push("low_confidence");
  }

  const adjustedCalories =
    Math.abs(statedCalories - macroCalories) > Math.max(60, macroCalories * 0.15)
      ? Math.max(statedCalories, macroCalories)
      : statedCalories;

  const numbers = [protein, carbs, fats, fiber, adjustedCalories, parsed.data.healthScore];
  const hasInvalidNumber = numbers.some((value) => !Number.isFinite(value) || value < 0);

  if (hasInvalidNumber) {
    validationIssues.push("invalid_numeric_values");
  }

  if (validationIssues.includes("missing_or_invalid_fields") || validationIssues.includes("invalid_numeric_values")) {
    return {
      analysis: null,
      validationIssues,
    };
  }

  return {
    analysis: AnalyzeMealResponse.parse({
      foodName,
      calories: roundToOneDecimal(adjustedCalories),
      confidence: parsed.data.confidence,
      quickInsight,
      macros: {
        protein,
        carbs,
        fats,
        fiber,
      },
      healthScore: roundToOneDecimal(clamp(parsed.data.healthScore, 1, 10)),
      suggestions,
      ingredients,
    }),
    validationIssues,
  };
}

function parseGeminiJson(content: string) {
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as unknown;
}

async function generateMealAnalysisDraft(imageBase64: string, mimeType: string, promptText: string) {
  const model = getGeminiModel();
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
    promptText,
  ]);

  return result.response.text();
}

async function getValidatedMealAnalysis(
  req: Request,
  imageBase64: string,
  mimeType: string,
  prompt: string,
  portion: Portion,
  plateSize: PlateSize,
) {
  const firstPassContent = await generateMealAnalysisDraft(
    imageBase64,
    mimeType,
    buildAnalyzeUserMessage(prompt, portion, plateSize),
  );

  let firstPassReview: MealAnalysisReview;
  try {
    firstPassReview = reviewMealAnalysis(parseGeminiJson(firstPassContent));
  } catch {
    firstPassReview = {
      analysis: null,
      validationIssues: ["invalid_json"],
    };
  }

  if (firstPassReview.analysis && firstPassReview.validationIssues.length === 0) {
    return firstPassReview.analysis;
  }

  req.log.info(
    { validationIssues: firstPassReview.validationIssues, portion, plateSize },
    "Running second Gemini refinement pass for meal analysis",
  );

  const refinedContent = await generateMealAnalysisDraft(
    imageBase64,
    mimeType,
    buildRefinementUserMessage(
      prompt,
      portion,
      plateSize,
      firstPassContent,
      firstPassReview.validationIssues,
    ),
  );

  let refinedReview: MealAnalysisReview;
  try {
    refinedReview = reviewMealAnalysis(parseGeminiJson(refinedContent));
  } catch {
    refinedReview = {
      analysis: null,
      validationIssues: ["invalid_json"],
    };
  }

  if (refinedReview.analysis) {
    return refinedReview.analysis;
  }

  if (firstPassReview.analysis) {
    req.log.warn(
      { validationIssues: firstPassReview.validationIssues },
      "Refinement pass failed, returning first-pass meal analysis",
    );
    return firstPassReview.analysis;
  }

  return null;
}

function toCachedResponse(analysis: AnalyzeMealResponseType): CachedAnalyzeMealResponse {
  return {
    ...analysis,
    cached: true,
    note: CACHE_NOTE,
  };
}

function sendInvalidAiResponse(req: Request, res: Response, content?: string) {
  req.log.error({ content }, "Invalid AI response");
  res.status(502).json({
    error: "invalid_ai_response",
    message: "AI response was invalid or missing required fields.",
  });
}

async function consumeDailyAnalyzeQuota(
  req: Request,
  userKey: string,
  imageHash: string,
  prompt: string,
  portion: Portion,
  plateSize: PlateSize,
) {
  if (!prisma || !isDatabaseConfigured) {
    return { allowed: true as const };
  }

  const windowStart = getStartOfUtcDay();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const requestCount = await tx.userRequest.count({
          where: {
            userKey,
            createdAt: {
              gte: windowStart,
            },
          },
        });

        if (requestCount >= DAILY_ANALYZE_LIMIT) {
          return { allowed: false as const, requestCount };
        }

        await tx.userRequest.create({
          data: {
            userKey,
            imageHash,
            prompt: prompt || null,
            portion,
            plateSize,
          },
        });

        return { allowed: true as const, requestCount: requestCount + 1 };
      },
      {
        isolationLevel: "Serializable"
      },
    );

    return result;
  } catch (err) {
    if ((err as any)?.code === "P2034") {
      req.log.warn({ err, userKey }, "Rate limit transaction conflict");
    } else {
      req.log.warn({ err, userKey }, "Failed to enforce meal analysis rate limit");
    }

    return { allowed: true as const };
  }
}

async function getCachedMealAnalysis(
  req: Request,
  imageHash: string,
  prompt: string,
  portion: Portion,
  plateSize: PlateSize,
) {
  if (!prisma || !isDatabaseConfigured) {
    return null;
  }

  try {
    const cachedAnalysis = await prisma.mealAnalysis.findUnique({
      where: {
        imageHash_prompt_portion_plateSize: {
          imageHash,
          prompt,
          portion,
          plateSize,
        },
      },
    });

    if (!cachedAnalysis) {
      return null;
    }

    return toCachedResponse(AnalyzeMealResponse.parse({
      foodName: cachedAnalysis.foodName,
      calories: cachedAnalysis.calories,
      confidence: cachedAnalysis.confidence,
      quickInsight: cachedAnalysis.quickInsight,
      macros: {
        protein: cachedAnalysis.protein,
        carbs: cachedAnalysis.carbs,
        fats: cachedAnalysis.fats,
        fiber: cachedAnalysis.fiber,
      },
      healthScore: cachedAnalysis.healthScore,
      suggestions: cachedAnalysis.suggestions,
      ingredients: cachedAnalysis.ingredients,
    }));
  } catch (err) {
    req.log.warn({ err, imageHash, portion, plateSize }, "Failed to read cached meal analysis");
    return null;
  }
}

async function storeMealAnalysis(
  req: Request,
  imageHash: string,
  prompt: string,
  portion: Portion,
  plateSize: PlateSize,
  analysis: ReturnType<typeof AnalyzeMealResponse.parse>,
) {
  if (!prisma || !isDatabaseConfigured) {
    return;
  }

  try {
    await prisma.mealAnalysis.upsert({
      where: {
        imageHash_prompt_portion_plateSize: {
          imageHash,
          prompt,
          portion,
          plateSize,
        },
      },
      update: {
        prompt,
        portion,
        plateSize,
        foodName: analysis.foodName,
        calories: analysis.calories,
        protein: analysis.macros.protein,
        carbs: analysis.macros.carbs,
        fats: analysis.macros.fats,
        fiber: analysis.macros.fiber,
        healthScore: analysis.healthScore,
        confidence: analysis.confidence,
        quickInsight: analysis.quickInsight,
        suggestions: analysis.suggestions,
        ingredients: analysis.ingredients,
      },
      create: {
        imageHash,
        prompt,
        portion,
        plateSize,
        foodName: analysis.foodName,
        calories: analysis.calories,
        protein: analysis.macros.protein,
        carbs: analysis.macros.carbs,
        fats: analysis.macros.fats,
        fiber: analysis.macros.fiber,
        healthScore: analysis.healthScore,
        confidence: analysis.confidence,
        quickInsight: analysis.quickInsight,
        suggestions: analysis.suggestions,
        ingredients: analysis.ingredients,
      },
    });
  } catch (err) {
    req.log.warn({ err, imageHash, portion, plateSize }, "Failed to store meal analysis");
  }
}

router.post("/meals/analyze", async (req, res) => {
  try {
    const body = AnalyzeMealBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", message: "Invalid request body" });
      return;
    }

    const normalizedPrompt = normalizePrompt(body.data.prompt);
    const portion = body.data.portion ?? DEFAULT_PORTION;
    const plateSize = body.data.plateSize ?? DEFAULT_PLATE_SIZE;
    const { imageBase64, mimeType } = body.data;
    const imageHash = hashImage(imageBase64);
    const userKey = getUserKey(req);

    const quotaResult = await consumeDailyAnalyzeQuota(
      req,
      userKey,
      imageHash,
      normalizedPrompt,
      portion,
      plateSize,
    );

    if (!quotaResult.allowed) {
      req.log.info({ userKey, imageHash }, "Daily meal analysis limit reached");
      res.status(429).json({
        error: RATE_LIMIT_ERROR,
        message: `Daily meal scan limit reached. You can analyze up to ${DAILY_ANALYZE_LIMIT} meals per UTC day.`,
      });
      return;
    }

    const cachedAnalysis = await getCachedMealAnalysis(
      req,
      imageHash,
      normalizedPrompt,
      portion,
      plateSize,
    );
    if (cachedAnalysis) {
      req.log.info({ imageHash, portion, plateSize }, "Returning cached meal analysis");
      res.json(cachedAnalysis);
      return;
    }

    const analysis = await getValidatedMealAnalysis(
      req,
      imageBase64,
      mimeType ?? "image/jpeg",
      normalizedPrompt,
      portion,
      plateSize,
    );

    if (!analysis) {
      sendInvalidAiResponse(req, res);
      return;
    }

    await storeMealAnalysis(req, imageHash, normalizedPrompt, portion, plateSize, analysis);

    res.json(analysis);
  } catch (err) {
    sendMealError(req, res, err, "Failed to analyze meal");
  }
});

router.post("/meals/insight", async (req, res) => {
  try {
    const body = GetMealInsightBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", message: "Invalid request body" });
      return;
    }

    const { mealAnalysis, insightType } = body.data;
    const insightPrompt = INSIGHT_PROMPTS[insightType];

    if (!insightPrompt) {
      res.status(400).json({ error: "invalid_insight_type", message: "Invalid insight type" });
      return;
    }

    const mealSummary = `
Meal: ${mealAnalysis.foodName}
Calories: ${mealAnalysis.calories} kcal
Protein: ${mealAnalysis.macros.protein}g
Carbs: ${mealAnalysis.macros.carbs}g
Fats: ${mealAnalysis.macros.fats}g
Fiber: ${mealAnalysis.macros.fiber}g
Health Score: ${mealAnalysis.healthScore}/10
Ingredients: ${mealAnalysis.ingredients.join(", ")}
`;

    const model = getGeminiModel();

    const systemInstruction = `You are SlickByte, an expert nutritionist AI. The user wants a specific insight about their meal. Respond ONLY with valid JSON in this exact format:
{
  "title": "short insight title",
  "content": "2-3 sentence main insight paragraph",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`;

    const result = await model.generateContent([
      systemInstruction,
      `Here is the meal information:\n${mealSummary}\n\n${insightPrompt}`,
    ]);

    const content = result.response.text();

    let insight;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insight = JSON.parse(cleaned);
    } catch {
      req.log.error({ content }, "Failed to parse insight response as JSON");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
      return;
    }

    res.json(insight);
  } catch (err) {
    sendMealError(req, res, err, "Failed to get insight");
  }
});

export default router;
