-- AlterEnum AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_RESUMED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_ADVANCED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_SESSION_CANCELLED';

-- AlterEnum AuditEntity
ALTER TYPE "AuditEntity" ADD VALUE 'AI_SESSION';

-- CreateEnum
CREATE TYPE "AiSessionStatus" AS ENUM (
  'CREATED',
  'AWAITING_INPUT',
  'INTERVIEWING',
  'READY_FOR_ANALYSIS',
  'ANALYZING',
  'PLANNING',
  'BUILDING',
  'REVIEWING',
  'AWAITING_APPROVAL',
  'APPROVED',
  'FAILED',
  'CANCELLED',
  'ARCHIVED'
);

CREATE TYPE "AiSessionMessageRole" AS ENUM ('SYSTEM', 'ASSISTANT', 'USER');

CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shopifyStoreId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "AiSessionStatus" NOT NULL DEFAULT 'CREATED',
    "currentManager" VARCHAR(100) NOT NULL,
    "currentPhase" VARCHAR(100) NOT NULL,
    "workflowMetadata" JSONB NOT NULL,
    "workflowContext" JSONB NOT NULL,
    "workflowVersion" VARCHAR(50) NOT NULL,
    "promptVersions" JSONB NOT NULL,
    "errorMessage" VARCHAR(2000),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiSessionMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiSessionMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "stepKey" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSessionMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSession_organizationId_idx" ON "AiSession"("organizationId");
CREATE INDEX "AiSession_shopifyStoreId_idx" ON "AiSession"("shopifyStoreId");
CREATE INDEX "AiSession_productId_idx" ON "AiSession"("productId");
CREATE INDEX "AiSession_organizationId_shopifyStoreId_productId_idx" ON "AiSession"("organizationId", "shopifyStoreId", "productId");
CREATE INDEX "AiSession_organizationId_status_idx" ON "AiSession"("organizationId", "status");
CREATE INDEX "AiSession_createdByUserId_idx" ON "AiSession"("createdByUserId");
CREATE INDEX "AiSession_lastActivityAt_idx" ON "AiSession"("lastActivityAt");
CREATE INDEX "AiSessionMessage_sessionId_idx" ON "AiSessionMessage"("sessionId");
CREATE INDEX "AiSessionMessage_sessionId_createdAt_idx" ON "AiSessionMessage"("sessionId", "createdAt");

ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "PlatformConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopifyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSessionMessage" ADD CONSTRAINT "AiSessionMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
