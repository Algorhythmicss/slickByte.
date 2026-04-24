# Limitations of Vision Models and a Constraint-Based Approach

---

## Abstract

Estimating calorie content from food images is an increasingly explored application of vision-language models. While such models demonstrate strong performance in food recognition, accurate calorie estimation remains fundamentally constrained by the problem of portion size estimation. This work analyzes why portion estimation from a single 2D image is inherently unreliable and proposes a constraint-based system that enhances model reasoning using structured prompts, user inputs, and reference objects. Rather than attempting to solve portion estimation directly, the approach focuses on reducing ambiguity and improving consistency through controlled assumptions, elicitation techniques, and system design.

---

## 1. Introduction

Recent advances in vision-language models have enabled applications that estimate calorie content from food images. These systems typically rely on identifying food items and mapping them to nutritional databases. However, calorie estimation is not solely a recognition problem. It is critically dependent on quantifying the amount of food present.

This introduces a key challenge:

> How can a model estimate portion size from a single image lacking scale, depth, and physical measurement?

This work argues that portion size estimation is not merely difficult but fundamentally underdetermined in the absence of additional information. We analyze the limitations of current models and propose a structured approach to mitigate these constraints.

(also I don't have the resources to do fancy stuff, so constraint-based approach is the best thing I could think of — anyways a better system design will always be appreciated even if you add fancy stuff to it later.)

A secondary argument of this work is that the bottleneck is not model intelligence, but model *elicitation* — the practice of designing inputs and system structure such that a model reliably surfaces latent knowledge it already possesses, rather than defaulting to weak heuristics.

---

## 2. Problem Formulation

(I know this is too formal, but I'm a physics guy — I love doing this.)

Let an image **I** represent a food scene. The goal is to estimate calorie content **C**, which depends on both food identity **F** and portion size **P**:

```
C = f(F, P)
```

While modern models can approximate **F**, the estimation of **P** is ill-defined due to missing spatial and physical information.

Thus, the problem reduces to:

> Estimating a real-world quantity **P** from incomplete visual data.

And then the engineering problem becomes:

> Given that **P** cannot be recovered precisely, how do we design a system that produces consistent, calibrated, and user-correctable estimates instead of confidently wrong ones?

---

## 3. Fundamental Limitations

### 3.1 Absence of Absolute Scale

A 2D image does not encode real-world dimensions. Multiple physical configurations can produce identical pixel representations.

For example:
- A small portion viewed closely
- A large portion viewed from afar

Both may appear visually similar. Thus, portion estimation is inherently ambiguous without external scale anchors.

### 3.2 Loss of Depth Information

Single-view images lack reliable depth cues. Models cannot accurately infer:
- thickness of food layers
- container depth
- volume distribution

As a result, volumetric estimation is not feasible.

### 3.3 Training Data Limitations

Vision-language models are trained on image-text pairs, not calibrated measurement datasets. Typical supervision includes:
- "a bowl of pasta"
- "a plate of rice and curry"

But excludes:
- gram-level annotations
- volume measurements
- standardized portion labels

Consequently, models do not learn quantitative mappings.

(You may think now that you should train a model to do so — but too much work for now.)

### 3.4 Reliance on Learned Priors

In the absence of measurement data, models rely on statistical priors:
- typical portion sizes
- common plate configurations
- culturally dominant food presentations

This leads to:
- bias toward "average servings"
- poor generalization to atypical portions

This is the core failure mode that elicitation techniques target — not by removing priors, but by replacing implicit ones with explicit, user-controlled ones.

### 3.5 Perspective and Framing Sensitivity

Image characteristics such as camera distance, angle, and cropping directly influence perceived size. This introduces variability in outputs for identical meals under different imaging conditions.

### 3.6 Container Ambiguity

The size and shape of containers (plates, bowls) significantly affect portion interpretation. Without known dimensions, models cannot distinguish between:
- large plate, small portion
- small plate, large portion

### 3.7 Visual Fullness as a Weak Proxy

Models often rely on surface coverage as a proxy for quantity. However:
- low-density foods occupy large area but contain fewer calories
- high-density foods occupy small area but contain more calories

Thus, visual fullness is not a reliable estimator.

---

## 4. Key Insight

> Portion size estimation from a single image is fundamentally underdetermined and cannot be solved purely through visual recognition.

Vision models do not measure. They approximate using priors and heuristics.

A secondary insight follows from this:

> The model already contains useful knowledge about food, portions, and cooking. The problem is not that the knowledge is absent — it is that naive prompting fails to reliably surface it.

This reframes the engineering task. The goal is not to inject knowledge into the model, but to *elicit* consistent, structured reasoning from knowledge the model already has.

---

## 5. Proposed Approach

Instead of attempting to directly solve portion estimation, we propose a constraint-based elicitation system that reduces ambiguity by introducing structured signals and controlled reasoning pipelines.

### 5.1 Elicitation as a Design Principle

**What is elicitation?**

(Honest note: I did not know this was called elicitation when I started doing it. I was just trying tricks to get better answers out of the model — breaking the question down, forcing it to state assumptions, asking it to reason step by step before giving a number. It worked, so I kept doing it. Apparently that has a name. I hate fancy terms, but I'll use this one because it describes something real and it makes me sound like I knew what I was doing. I didn't.)

Elicitation is the practice of designing prompts, reasoning structures, and system scaffolding such that a model produces reliable, consistent outputs — not by changing what the model knows, but by changing *how that knowledge is accessed*.

A model asked "how many calories is this?" will likely produce a single confident number based on weak visual priors. The same model, guided through a structured reasoning chain, will surface more explicit assumptions, intermediate estimates, and flagged uncertainties.

The difference is not model capability. It is elicitation design.

(Think of it like this: a physics student asked to "solve this problem" might panic and guess. The same student given a structured template — draw a free body diagram, identify forces, write Newton's second law — will produce a much more reliable answer. The knowledge was always there. The structure surfaced it.)

This reframes the entire project:

> We are not trying to make the model smarter. We are building a control system around a probabilistic model, designed to elicit structured, calibrated, and consistent reasoning.

### 5.2 Chain-of-Thought Elicitation via Structured Prompting

**Concept**

Chain-of-thought elicitation decomposes a hard, underspecified task into a sequence of simpler sub-tasks, each of which the model handles more reliably in isolation.

For calorie estimation, the naive task is:

```
Image → Calories
```

This is poorly specified and encourages the model to skip reasoning and rely on learned averages.

The elicited version decomposes this into:

```
Image → Food Identification
      → Plate Coverage Estimation (%)
      → Baseline Portion Assumption (medium)
      → User Constraint Adjustment (small / medium / large)
      → Reference Object Scaling (if available)
      → Calorie Estimate with Stated Assumptions
```

Each step is a narrower, better-defined sub-problem. The model is forced to make reasoning visible and intermediate outputs checkable.

**Why this works**

Models trained on human-generated text tend to produce more accurate outputs when they are prompted to reason step-by-step rather than respond directly. This is because human expert reasoning is structured — and that structure is captured in training data. Prompting for step-by-step reasoning elicits that pattern.

### 5.3 Uncertainty Elicitation

**The problem with point estimates**

A model that outputs "450 calories" is making a claim with false precision. The true uncertainty is large. Hiding it does not remove it — it misleads the user.

**Proposed approach**

Instead of prompting for a single estimate, the system elicits calibrated uncertainty outputs:

```
Estimated Calories: 420 – 580 kcal
Confidence: Medium
Primary source of uncertainty: Portion size (cannot determine container depth)
Assumptions made: Medium portion, standard dinner plate (~26 cm), no hidden ingredients
```

This is achieved through explicit prompt instructions:

- "Do not provide a single number. Provide a plausible range."
- "State every assumption you are making."
- "Rate your confidence as Low / Medium / High and explain why."

**Why this matters**

A system that says "I think 450, but could be anywhere from 350–600" is more honest and ultimately more useful than one that says "450." Users can incorporate uncertainty into decisions. More importantly, surfacing uncertainty discourages over-reliance and encourages user correction — which is itself a constraint input.

(Also, it's just the right thing to do. Pretending your app is more accurate than it is is how you lose users when they realize it isn't.)

### 5.4 Self-Consistency Sampling

**Concept**

Even under identical inputs, language model outputs vary across runs due to sampling randomness. This variance is a source of unreliability.

Self-consistency sampling addresses this by:

1. Running the same structured prompt N times (typically 3–5)
2. Collecting the resulting estimates
3. Aggregating via median (for calorie numbers) or majority vote (for food identification)

**Why this works**

Correct reasoning paths tend to converge on similar answers. Incorrect or hallucinated paths tend to diverge. Taking the median across multiple samples therefore reduces the influence of outlier runs and improves consistency.

(You may think this is expensive in terms of API calls — it is. But for a v1 prototype where accuracy matters more than cost, it's a useful technique to have in the toolkit. You can always disable it later.)

**Expected benefit**

For the same food image, the system is less likely to produce wildly different estimates across sessions. Variance reduction is one of the primary evaluation targets.

### 5.5 Controlled Portion Assumptions via User Constraints

**User Inputs**
- Portion size selection: small / medium / large
- Optional plate size specification

These inputs act as hard external constraints injected into the reasoning chain — replacing the model's implicit prior with an explicit, user-provided one.

### 5.6 Reference Object-Based Scaling

**Concept**

Introduce known objects in the scene (e.g., spoon, fork, phone) to provide approximate scale.

**Implementation**

Predefined object sizes:
- spoon ≈ 15 cm
- fork ≈ 18 cm
- phone ≈ 15 cm

If detected, the model uses these as relative anchors for estimating plate dimensions and adjusts the portion estimate accordingly.

**Design Decision**

We avoid allowing the model to infer object sizes dynamically (through web search) due to:
- inconsistency across runs
- hallucination risks
- lack of reproducibility

Fixed constants ensure deterministic behavior. This is also an elicitation design decision — we are not asking the model to figure out what a spoon looks like. We are telling it, so it can focus its reasoning on the actual estimation task.

---

## 6. Expected Outcomes

The proposed system does not eliminate error but aims to:
- reduce variance in outputs
- improve consistency across similar inputs
- provide interpretable intermediate reasoning
- expose uncertainty rather than hiding it
- enable user-guided correction through constraint inputs

---

## 7. Limitations

Despite improvements, several constraints remain:
- no true depth estimation
- no exact volumetric calculation
- dependence on image quality
- limited handling of complex mixed dishes
- self-consistency sampling increases latency and API cost
- uncertainty ranges may confuse users expecting a precise answer

---

## 8. Evaluation Strategy

We propose controlled experiments comparing:
- baseline vs structured prompting
- with vs without reference objects
- with vs without self-consistency sampling
- across portion size selections
- with vs without uncertainty output

**Evaluation metrics:**
- consistency (variance across repeated runs)
- qualitative correctness (ground truth comparison where available)
- user trust and retention (does showing uncertainty help or hurt engagement?)

Note on the primary metric:

Accuracy alone is not the right target. A system that is 20% less accurate but produces consistent, interpretable, and correctable outputs may be significantly more useful in practice. Retention and repeated use are better long-term proxies for product value.

---

## 9. Conclusion

Portion size estimation remains the primary bottleneck in image-based calorie estimation. Rather than attempting to solve an underdetermined problem directly, this work proposes that the core engineering challenge is one of *elicitation* — designing system structure that reliably surfaces model knowledge, exposes uncertainty honestly, and integrates user constraints to reduce ambiguity.

The constraint-based approach presented here — combining chain-of-thought elicitation, uncertainty quantification, self-consistency sampling, and user-provided inputs — does not require a better model. It requires a better system around the model.

That distinction is the central design insight of this project.

