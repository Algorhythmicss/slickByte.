import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzeMeal, type MealAnalysis } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const LOADING_MESSAGES = [
  "Analyzing your meal...",
  "Estimating oil content...",
  "Detecting paneer density...",
  "Consulting the macro gods...",
  "Scanning for hidden calories...",
  "Negotiating with carbohydrates...",
  "Computing cheese coefficient...",
  "Measuring biryani complexity...",
  "Weighing your life choices...",
  "Almost done, we promise...",
];

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSIONS = [1600, 1400, 1200, 1000];
const JPEG_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58];
const PORTION_OPTIONS = [
  { value: "small", label: "Small", hint: "Light snack or half serving" },
  { value: "medium", label: "Medium", hint: "Standard home portion" },
  { value: "large", label: "Large", hint: "Heavy serving or restaurant plate" },
] as const;
const PLATE_SIZE_OPTIONS = [
  { value: "small_plate", label: "Small plate", hint: "Dessert plate or side plate" },
  { value: "medium_plate", label: "Medium plate", hint: "Regular dinner plate" },
  { value: "large_plate", label: "Large plate", hint: "Big thali or oversized plate" },
] as const;
const REFERENCE_OBJECT_OPTIONS = [
  { value: "none", label: "None", hint: "No scale object in the frame" },
  { value: "spoon", label: "Spoon", hint: "Useful for close-up bowls or plates" },
  { value: "fork", label: "Fork", hint: "Good rough length reference" },
  { value: "phone", label: "Phone", hint: "Works well when placed beside the plate" },
] as const;

type AnalyzeErrorDetails = {
  title: string;
  description: string;
};

type ApiLikeError = {
  status?: number;
  message?: string;
  data?: {
    error?: string;
    message?: string;
  } | null;
};

function estimateBase64Size(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function getImageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load the selected image."));
    };

    image.src = objectUrl;
  });
}

async function prepareImageForUpload(file: File) {
  const originalDataUrl = await getImageDataUrl(file);
  const [, originalBase64 = ""] = originalDataUrl.split(",", 2);

  if (estimateBase64Size(originalBase64) <= MAX_UPLOAD_BYTES) {
    return {
      imageBase64: originalBase64,
      mimeType: file.type || "image/jpeg",
      optimized: false,
    };
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  for (const maxDimension of MAX_IMAGE_DIMENSIONS) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
      const optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);
      const [, optimizedBase64 = ""] = optimizedDataUrl.split(",", 2);

      if (estimateBase64Size(optimizedBase64) <= MAX_UPLOAD_BYTES) {
        return {
          imageBase64: optimizedBase64,
          mimeType: "image/jpeg",
          optimized: true,
        };
      }
    }
  }

  throw new Error("This image is too large to upload. Try a smaller or more compressed photo.");
}

function getAnalyzeErrorDetails(error: unknown): AnalyzeErrorDetails {
  const apiError = error as ApiLikeError | null;
  const errorCode = apiError?.data?.error;
  const apiMessage = apiError?.data?.message;

  if (errorCode === "payload_too_large" || apiError?.status === 413) {
    return {
      title: "That photo is still too large.",
      description: apiMessage ?? "Try a smaller image or crop the photo tighter around the meal.",
    };
  }

  if (errorCode === "config_error") {
    return {
      title: "The AI service is not configured.",
      description: apiMessage ?? "Please check the Gemini API key in the API server environment.",
    };
  }

  if (errorCode === "validation_error") {
    return {
      title: "The photo request could not be processed.",
      description: apiMessage ?? "Please reselect the image and try again.",
    };
  }

  if (errorCode === "parse_error") {
    return {
      title: "The AI responded in an unexpected format.",
      description: "Please retry the analysis. If it keeps happening, we should tighten the backend response handling.",
    };
  }

  if (errorCode === "ai_quota_exceeded") {
    return {
      title: "Meal analysis is temporarily unavailable.",
      description:
        apiMessage ??
        "The Gemini API quota is currently exhausted. Please try again later.",
    };
  }

  if (errorCode === "rate_limit_exceeded" || apiError?.status === 429) {
    return {
      title: "Daily scan limit reached.",
      description: apiMessage ?? "You can scan up to 5 meals per day from this connection.",
    };
  }

  return {
    title: "Analysis failed. Please try again.",
    description:
      apiMessage ??
      apiError?.message ??
      "Make sure the image clearly shows food and your API server is running.",
  };
}

export default function Analyze() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [portion, setPortion] = useState<"small" | "medium" | "large">("medium");
  const [plateSize, setPlateSize] = useState<"small_plate" | "medium_plate" | "large_plate">("medium_plate");
  const [referenceObject, setReferenceObject] = useState<"none" | "spoon" | "fork" | "phone">("none");
  const [isDragging, setIsDragging] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyzeMutation = useAnalyzeMeal();
  const isAnalyzing = analyzeMutation.isPending || isPreparingUpload;
  const analyzeError = analyzeMutation.error
    ? getAnalyzeErrorDetails(analyzeMutation.error)
    : null;

  useEffect(() => {
    if (isAnalyzing) {
      loadingIntervalRef.current = setInterval(() => {
        setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 1600);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [isAnalyzing]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsPreparingUpload(true);
    setLoadingMsgIndex(0);

    try {
      const preparedImage = await prepareImageForUpload(imageFile);

      if (preparedImage.optimized) {
        toast({
          title: "Photo optimized before upload",
          description: "We automatically compressed the image so analysis stays fast and reliable.",
        });
      }

      setLoadingMsgIndex(0);

      analyzeMutation.mutate(
        {
          data: {
            imageBase64: preparedImage.imageBase64,
            mimeType: preparedImage.mimeType,
            prompt: prompt.trim() || undefined,
            portion,
            plateSize,
            referenceObject,
          },
        },
        {
          onSuccess: (data: MealAnalysis) => {
            localStorage.setItem("slickbyte_analysis", JSON.stringify(data));
            localStorage.setItem("slickbyte_image", imagePreview!);
            navigate("/result");
          },
          onError: (error: unknown) => {
            const details = getAnalyzeErrorDetails(error);
            toast({
              variant: "destructive",
              title: details.title,
              description: details.description,
            });
          },
          onSettled: () => {
            setIsPreparingUpload(false);
          },
        }
      );
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "Please choose a different image and try again.";

      toast({
        variant: "destructive",
        title: "Unable to prepare this photo",
        description,
      });
      setIsPreparingUpload(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="font-epilogue tracking-tight text-2xl font-bold text-primary"
          >
            SlickByte
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-10"
        >
          <div className="text-center space-y-3">
            <h1 className="font-epilogue text-5xl font-extrabold tracking-tight">
              Snap your <span className="text-primary italic">plate.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload a photo of your meal and let the AI decode every bite.
            </p>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-[2rem] overflow-hidden transition-all cursor-pointer
              ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
              ${imagePreview ? "border-solid border-primary/30" : ""}
            `}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative aspect-[4/3]"
                >
                  <img
                    src={imagePreview}
                    alt="Your meal"
                    className="w-full h-full object-cover"
                  />
                  {isAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-5"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                            auto_awesome
                          </span>
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={loadingMsgIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.35 }}
                          className="font-epilogue font-bold text-xl text-center px-8"
                        >
                          {LOADING_MESSAGES[loadingMsgIndex]}
                        </motion.p>
                      </AnimatePresence>
                    </motion.div>
                  )}
                  {!isAnalyzing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 backdrop-blur-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary">
                      add_photo_alternate
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-epilogue font-bold text-lg text-foreground">
                      Drop your meal photo here
                    </p>
                    <p className="text-sm mt-1">or click to browse</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full mt-2"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    <span className="material-symbols-outlined text-[18px] mr-1">photo_camera</span>
                    Choose Photo
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-[2rem] border border-border bg-white/80 p-6 shadow-sm">
            <h2 className="font-epilogue text-xl font-bold">How to get the most accurate results</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                <span>Use a top-down photo (avoid angled shots)</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                <span>Include a reference object (spoon, fork, or phone)</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                <span>Ensure the full plate is visible</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                <span>Avoid blurry or low-light images</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                <span>Select correct portion size before analyzing</span>
              </li>
            </ul>
          </div>

          {imagePreview && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                  Portion size
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PORTION_OPTIONS.map((option) => {
                    const isActive = portion === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPortion(option.value)}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 shadow-[0_12px_30px_-18px_rgba(59,130,246,0.7)]"
                            : "border-border bg-white hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <p className="font-epilogue text-base font-bold text-foreground">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                  Plate size
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PLATE_SIZE_OPTIONS.map((option) => {
                    const isActive = plateSize === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlateSize(option.value)}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 shadow-[0_12px_30px_-18px_rgba(59,130,246,0.7)]"
                            : "border-border bg-white hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <p className="font-epilogue text-base font-bold text-foreground">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  This gets passed into the Gemini prompt so serving-size estimates use your plate as a scale cue.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                  Reference object
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {REFERENCE_OBJECT_OPTIONS.map((option) => {
                    const isActive = referenceObject === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setReferenceObject(option.value)}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 shadow-[0_12px_30px_-18px_rgba(59,130,246,0.7)]"
                            : "border-border bg-white hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <p className="font-epilogue text-base font-bold text-foreground">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  A spoon, fork, or phone gives the backend a rough scale cue and boosts confidence.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                  Add context <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. "This is a restaurant portion" or "Homemade, less oil used"'
                  rows={2}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground/50 transition-all"
                />
              </div>

              <Button
                size="lg"
                className="w-full rounded-full font-epilogue font-bold text-lg py-7 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                <span className="material-symbols-outlined text-xl mr-2">search</span>
                Decode This Meal
              </Button>

              <button
                onClick={() => { setImagePreview(null); setImageFile(null); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Choose a different photo
              </button>
            </motion.div>
          )}

          {analyzeError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-center"
            >
              <span className="material-symbols-outlined text-destructive mb-2">error</span>
              <p className="font-semibold text-destructive">{analyzeError.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{analyzeError.description}</p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
