CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "MealAnalysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "imageHash" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "healthScore" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "quickInsight" TEXT NOT NULL,
    "suggestions" TEXT[] NOT NULL,
    "ingredients" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "imageHash" TEXT NOT NULL,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MealAnalysis_imageHash_key" ON "MealAnalysis"("imageHash");
CREATE INDEX "UserRequest_imageHash_idx" ON "UserRequest"("imageHash");
CREATE INDEX "UserRequest_createdAt_idx" ON "UserRequest"("createdAt");
