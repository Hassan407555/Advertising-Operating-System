-- CreateEnum
CREATE TYPE "AnalyticsLevel" AS ENUM ('CAMPAIGN', 'AD_SET', 'AD', 'CREATIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StorageProvider" ADD VALUE 'GCS';
ALTER TYPE "StorageProvider" ADD VALUE 'Azure';

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "level" "AnalyticsLevel" NOT NULL,
    "campaignId" TEXT,
    "adSetId" TEXT,
    "adId" TEXT,
    "creativeId" TEXT,
    "snapshotDate" DATE NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(18,4),
    "cpm" DECIMAL(18,4),
    "ctr" DECIMAL(8,4),
    "conversions" DECIMAL(18,4),
    "conversionValue" DECIMAL(18,2),
    "revenue" DECIMAL(18,2),
    "roas" DECIMAL(18,4),
    "videoViews" INTEGER NOT NULL DEFAULT 0,
    "platformMetrics" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_organizationId_idx" ON "AnalyticsSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_snapshotDate_idx" ON "AnalyticsSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_platform_idx" ON "AnalyticsSnapshot"("platform");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_level_idx" ON "AnalyticsSnapshot"("level");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_campaignId_idx" ON "AnalyticsSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_adSetId_idx" ON "AnalyticsSnapshot"("adSetId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_adId_idx" ON "AnalyticsSnapshot"("adId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_creativeId_idx" ON "AnalyticsSnapshot"("creativeId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_organizationId_snapshotDate_idx" ON "AnalyticsSnapshot"("organizationId", "snapshotDate");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_organizationId_platform_snapshotDate_idx" ON "AnalyticsSnapshot"("organizationId", "platform", "snapshotDate");

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
