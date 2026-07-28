-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "shopifyStoreId" TEXT;

-- Backfill from AI draft metadata when present and the store still exists
UPDATE "Campaign" AS c
SET "shopifyStoreId" = c.metadata->>'shopifyStoreId'
FROM "PlatformConnection" AS pc
WHERE c."shopifyStoreId" IS NULL
  AND c.metadata IS NOT NULL
  AND c.metadata->>'shopifyStoreId' IS NOT NULL
  AND pc.id = c.metadata->>'shopifyStoreId'
  AND pc."organizationId" = c."organizationId"
  AND pc."deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Campaign_organizationId_shopifyStoreId_idx" ON "Campaign"("organizationId", "shopifyStoreId");

-- CreateIndex
CREATE INDEX "Campaign_shopifyStoreId_idx" ON "Campaign"("shopifyStoreId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "PlatformConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
