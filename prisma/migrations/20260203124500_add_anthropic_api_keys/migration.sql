-- Add Anthropic API keys to user profiles
ALTER TABLE "User" ADD COLUMN "anthropicApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "anthropicApiKeyLastFour" TEXT;

-- Enforce uniqueness to match Prisma schema
CREATE UNIQUE INDEX "User_anthropicApiKey_key" ON "User"("anthropicApiKey");
