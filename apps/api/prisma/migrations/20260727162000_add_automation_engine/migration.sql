-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_PIPELINE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_PIPELINE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_PIPELINE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RUN_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RUN_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_RUN_FAILED';

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'AUTOMATION';

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('NEW_PRODUCT', 'MANUAL_LAUNCH', 'SCHEDULED_LAUNCH');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('GENERATE_CAMPAIGN', 'GENERATE_AI_COPY', 'PROCESS_MEDIA', 'PUBLISH_CAMPAIGN', 'SEND_NOTIFICATION');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "AutomationPipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerConfig" JSONB,
    "actions" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(1000),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationStep" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" "AutomationStepStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "errorMessage" VARCHAR(1000),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationPipeline_organizationId_idx" ON "AutomationPipeline"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationPipeline_organizationId_deletedAt_idx" ON "AutomationPipeline"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "AutomationPipeline_triggerType_idx" ON "AutomationPipeline"("triggerType");

-- CreateIndex
CREATE INDEX "AutomationPipeline_isEnabled_idx" ON "AutomationPipeline"("isEnabled");

-- CreateIndex
CREATE INDEX "AutomationPipeline_deletedAt_idx" ON "AutomationPipeline"("deletedAt");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_idx" ON "AutomationRun"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationRun_pipelineId_idx" ON "AutomationRun"("pipelineId");

-- CreateIndex
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- CreateIndex
CREATE INDEX "AutomationRun_triggerType_idx" ON "AutomationRun"("triggerType");

-- CreateIndex
CREATE INDEX "AutomationRun_createdAt_idx" ON "AutomationRun"("createdAt");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_createdAt_idx" ON "AutomationRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_pipelineId_idx" ON "AutomationRun"("organizationId", "pipelineId");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_status_idx" ON "AutomationRun"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationStep_runId_stepOrder_key" ON "AutomationStep"("runId", "stepOrder");

-- CreateIndex
CREATE INDEX "AutomationStep_organizationId_idx" ON "AutomationStep"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationStep_runId_idx" ON "AutomationStep"("runId");

-- CreateIndex
CREATE INDEX "AutomationStep_status_idx" ON "AutomationStep"("status");

-- CreateIndex
CREATE INDEX "AutomationStep_actionType_idx" ON "AutomationStep"("actionType");

-- AddForeignKey
ALTER TABLE "AutomationPipeline" ADD CONSTRAINT "AutomationPipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "AutomationPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStep" ADD CONSTRAINT "AutomationStep_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStep" ADD CONSTRAINT "AutomationStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
