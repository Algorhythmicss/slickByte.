ALTER TABLE "MealAnalysis"
  ADD COLUMN "referenceObject" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "foodItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "portionAssumption" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "reasoning" TEXT NOT NULL DEFAULT '';

ALTER TABLE "UserRequest"
  ADD COLUMN "referenceObject" TEXT NOT NULL DEFAULT 'none';

DROP INDEX IF EXISTS "MealAnalysis_imageHash_prompt_portion_plateSize_key";

CREATE UNIQUE INDEX "MealAnalysis_imageHash_prompt_portion_plateSize_referenceObject_key"
  ON "MealAnalysis"("imageHash", "prompt", "portion", "plateSize", "referenceObject");
