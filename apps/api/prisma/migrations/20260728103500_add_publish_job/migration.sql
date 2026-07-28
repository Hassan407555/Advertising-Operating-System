-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('PENDING', 'VALIDATING', 'PUBLISHING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "status" "PublishJobStatus" NOT NULL DEFAULT 'PENDING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "requestedByUserId" TEXT,
    "errorMessage" VARCHAR(2000),
    "request" JSONB,
    "result" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublishJob_organizationId_idx" ON "PublishJob"("organizationId");

-- CreateIndex
CREATE INDEX "PublishJob_campaignId_idx" ON "PublishJob"("campaignId");

-- CreateIndex
CREATE INDEX "PublishJob_platform_idx" ON "PublishJob"("platform");

-- CreateIndex
CREATE INDEX "PublishJob_status_idx" ON "PublishJob"("status");

-- CreateIndex
CREATE INDEX "PublishJob_organizationId_campaignId_idx" ON "PublishJob"("organizationId", "campaignId");

-- CreateIndex
CREATE INDEX "PublishJob_organizationId_createdAt_idx" ON "PublishJob"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
