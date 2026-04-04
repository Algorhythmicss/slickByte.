DROP INDEX IF EXISTS "MealAnalysis_imageHash_key";

ALTER TABLE "MealAnalysis"
  ADD COLUMN "prompt" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "portion" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "plateSize" TEXT NOT NULL DEFAULT 'medium_plate';

ALTER TABLE "UserRequest"
  ADD COLUMN "portion" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "plateSize" TEXT NOT NULL DEFAULT 'medium_plate';

CREATE UNIQUE INDEX "MealAnalysis_imageHash_prompt_portion_plateSize_key"
  ON "MealAnalysis"("imageHash", "prompt", "portion", "plateSize");
