ALTER TABLE "UserRequest"
ADD COLUMN "userKey" TEXT NOT NULL DEFAULT 'anonymous';

CREATE INDEX "UserRequest_userKey_createdAt_idx" ON "UserRequest"("userKey", "createdAt");
