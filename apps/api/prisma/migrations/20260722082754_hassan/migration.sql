/*
  Warnings:

  - You are about to alter the column `ipAddress` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - You are about to drop the column `createdBy` on the `Invitation` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `Invitation` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `slug` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the column `passwordResetToken` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `language` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `timezone` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - Added the required column `createdByUserId` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('META', 'GOOGLE', 'TIKTOK', 'LINKEDIN', 'SNAPCHAT', 'PINTEREST', 'MICROSOFT', 'TWITTER', 'REDDIT', 'AMAZON');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'RUB', 'ZAR', 'HKD', 'TWD', 'THB', 'VND', 'IDR', 'MYR', 'PHP', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'EGP', 'NGN', 'KES', 'GHS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS', 'SALES', 'APP_PROMOTION', 'VIDEO', 'LOCAL', 'CATALOG_SALES', 'STORE_VISITS', 'MESSAGES');

-- CreateEnum
CREATE TYPE "CampaignBuyingType" AS ENUM ('AUCTION', 'RESERVED', 'FIXED', 'PROGRAMMATIC');

-- CreateEnum
CREATE TYPE "AdSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL', 'COLLECTION', 'SLIDESHOW', 'STORY', 'MESSAGE', 'INTERACTIVE', 'PLAYABLE', 'AUDIO', 'TEXT', 'HTML5');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING', 'SYNCING', 'FAILED', 'PARTIAL', 'OUT_OF_SYNC', 'DISABLED');

-- CreateEnum
CREATE TYPE "AdAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApiKeyRole" AS ENUM ('READ', 'WRITE', 'ADMIN', 'ANALYTICS', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "BillingEvent" AS ENUM ('IMPRESSIONS', 'CLICKS', 'CONVERSIONS', 'THRUPLAY', 'VIEWS', 'LANDINGS', 'INSTALLS');

-- CreateEnum
CREATE TYPE "CallToAction" AS ENUM ('LEARN_MORE', 'SHOP_NOW', 'DOWNLOAD', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW', 'GET_OFFER', 'GET_QUOTE', 'GET_STARTED', 'INSTALL_APP', 'LISTEN', 'ORDER_NOW', 'PLAY_GAME', 'REGISTER_NOW', 'RENT_NOW', 'SEE_MORE', 'SEND_EMAIL', 'SEND_MESSAGE', 'SEND_WHATSAPP', 'SUBSCRIBE', 'VISIT_SITE', 'WATCH_MORE', 'WATCH_NOW', 'YES');

-- CreateEnum
CREATE TYPE "CreativeAssetType" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL_CARD', 'COLLECTION_ITEM', 'SLIDESHOW_FRAME', 'STORY_MEDIA', 'PLAYABLE', 'AUDIO', 'HTML', 'PDF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_DECLINED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_RESENT';
ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_EXPIRED';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropIndex
DROP INDEX "Invitation_organizationId_email_idx";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "ipAddress" SET DATA TYPE VARCHAR(45);

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "createdBy",
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(254);

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "slug" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordResetToken",
ADD COLUMN     "passwordResetTokenHash" TEXT,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
ALTER COLUMN "language" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "timezone" SET DATA TYPE VARCHAR(50);

-- CreateTable
CREATE TABLE "PlatformConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "accountId" VARCHAR(255) NOT NULL,
    "accountName" VARCHAR(255) NOT NULL,
    "externalName" VARCHAR(255),
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "webhookSecret" TEXT,
    "webhookUrl" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL,
    "platformConnectionId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" VARCHAR(100)[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" VARCHAR(255),
    "rotatedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platformConnectionId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "externalName" VARCHAR(255),
    "externalStatus" VARCHAR(50),
    "accountName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(100),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(50) NOT NULL,
    "status" "AdAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spend" DECIMAL(18,2),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" DECIMAL(18,2),
    "deletedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "externalName" VARCHAR(255),
    "externalStatus" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100),
    "objective" "CampaignObjective" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "buyingType" "CampaignBuyingType" NOT NULL DEFAULT 'AUCTION',
    "dailyBudget" DECIMAL(18,2),
    "lifetimeBudget" DECIMAL(18,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spend" DECIMAL(18,2),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" DECIMAL(18,2),
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "externalName" VARCHAR(255),
    "externalStatus" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "status" "AdSetStatus" NOT NULL DEFAULT 'DRAFT',
    "dailyBudget" DECIMAL(18,2),
    "lifetimeBudget" DECIMAL(18,2),
    "bidAmount" DECIMAL(18,2),
    "billingEvent" "BillingEvent",
    "targeting" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spend" DECIMAL(18,2),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" DECIMAL(18,2),
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "creativeId" TEXT,
    "externalId" VARCHAR(255) NOT NULL,
    "externalName" VARCHAR(255),
    "externalStatus" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spend" DECIMAL(18,2),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" DECIMAL(18,2),
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" VARCHAR(255),
    "externalName" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "type" "CreativeType" NOT NULL,
    "headline" VARCHAR(255),
    "primaryText" TEXT,
    "description" TEXT,
    "callToAction" "CallToAction",
    "landingPageUrl" VARCHAR(2000),
    "deepLinkUrl" VARCHAR(2000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creativeId" TEXT,
    "adId" TEXT,
    "assetType" "CreativeAssetType" NOT NULL,
    "url" VARCHAR(2000) NOT NULL,
    "thumbnailUrl" VARCHAR(2000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "keyHash" TEXT NOT NULL,
    "role" "ApiKeyRole" NOT NULL DEFAULT 'READ',
    "permissions" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformConnection_organizationId_deletedAt_idx" ON "PlatformConnection"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "PlatformConnection_organizationId_idx" ON "PlatformConnection"("organizationId");

-- CreateIndex
CREATE INDEX "PlatformConnection_platform_idx" ON "PlatformConnection"("platform");

-- CreateIndex
CREATE INDEX "PlatformConnection_status_idx" ON "PlatformConnection"("status");

-- CreateIndex
CREATE INDEX "PlatformConnection_syncStatus_idx" ON "PlatformConnection"("syncStatus");

-- CreateIndex
CREATE INDEX "PlatformConnection_deletedAt_idx" ON "PlatformConnection"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConnection_organizationId_platform_accountId_key" ON "PlatformConnection"("organizationId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "PlatformCredential_platformConnectionId_idx" ON "PlatformCredential"("platformConnectionId");

-- CreateIndex
CREATE INDEX "PlatformCredential_isActive_idx" ON "PlatformCredential"("isActive");

-- CreateIndex
CREATE INDEX "PlatformCredential_expiresAt_idx" ON "PlatformCredential"("expiresAt");

-- CreateIndex
CREATE INDEX "PlatformCredential_revokedAt_idx" ON "PlatformCredential"("revokedAt");

-- CreateIndex
CREATE INDEX "AdAccount_organizationId_deletedAt_idx" ON "AdAccount"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "AdAccount_organizationId_idx" ON "AdAccount"("organizationId");

-- CreateIndex
CREATE INDEX "AdAccount_platformConnectionId_idx" ON "AdAccount"("platformConnectionId");

-- CreateIndex
CREATE INDEX "AdAccount_platform_idx" ON "AdAccount"("platform");

-- CreateIndex
CREATE INDEX "AdAccount_status_idx" ON "AdAccount"("status");

-- CreateIndex
CREATE INDEX "AdAccount_externalId_idx" ON "AdAccount"("externalId");

-- CreateIndex
CREATE INDEX "AdAccount_deletedAt_idx" ON "AdAccount"("deletedAt");

-- CreateIndex
CREATE INDEX "AdAccount_isActive_idx" ON "AdAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_organizationId_platformConnectionId_externalId_key" ON "AdAccount"("organizationId", "platformConnectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_platformConnectionId_externalId_key" ON "AdAccount"("platformConnectionId", "externalId");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_deletedAt_idx" ON "Campaign"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- CreateIndex
CREATE INDEX "Campaign_adAccountId_idx" ON "Campaign"("adAccountId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_objective_idx" ON "Campaign"("objective");

-- CreateIndex
CREATE INDEX "Campaign_externalId_idx" ON "Campaign"("externalId");

-- CreateIndex
CREATE INDEX "Campaign_startDate_idx" ON "Campaign"("startDate");

-- CreateIndex
CREATE INDEX "Campaign_endDate_idx" ON "Campaign"("endDate");

-- CreateIndex
CREATE INDEX "Campaign_deletedAt_idx" ON "Campaign"("deletedAt");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE INDEX "Campaign_archivedAt_idx" ON "Campaign"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_organizationId_adAccountId_externalId_key" ON "Campaign"("organizationId", "adAccountId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_adAccountId_externalId_key" ON "Campaign"("adAccountId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_organizationId_slug_key" ON "Campaign"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "AdSet_organizationId_deletedAt_idx" ON "AdSet"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "AdSet_organizationId_idx" ON "AdSet"("organizationId");

-- CreateIndex
CREATE INDEX "AdSet_campaignId_idx" ON "AdSet"("campaignId");

-- CreateIndex
CREATE INDEX "AdSet_status_idx" ON "AdSet"("status");

-- CreateIndex
CREATE INDEX "AdSet_externalId_idx" ON "AdSet"("externalId");

-- CreateIndex
CREATE INDEX "AdSet_deletedAt_idx" ON "AdSet"("deletedAt");

-- CreateIndex
CREATE INDEX "AdSet_isActive_idx" ON "AdSet"("isActive");

-- CreateIndex
CREATE INDEX "AdSet_archivedAt_idx" ON "AdSet"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdSet_organizationId_campaignId_externalId_key" ON "AdSet"("organizationId", "campaignId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSet_campaignId_externalId_key" ON "AdSet"("campaignId", "externalId");

-- CreateIndex
CREATE INDEX "Ad_organizationId_deletedAt_idx" ON "Ad"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Ad_organizationId_idx" ON "Ad"("organizationId");

-- CreateIndex
CREATE INDEX "Ad_adSetId_idx" ON "Ad"("adSetId");

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "Ad_externalId_idx" ON "Ad"("externalId");

-- CreateIndex
CREATE INDEX "Ad_deletedAt_idx" ON "Ad"("deletedAt");

-- CreateIndex
CREATE INDEX "Ad_isActive_idx" ON "Ad"("isActive");

-- CreateIndex
CREATE INDEX "Ad_archivedAt_idx" ON "Ad"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_organizationId_adSetId_externalId_key" ON "Ad"("organizationId", "adSetId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_adSetId_externalId_key" ON "Ad"("adSetId", "externalId");

-- CreateIndex
CREATE INDEX "Creative_organizationId_deletedAt_idx" ON "Creative"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Creative_organizationId_idx" ON "Creative"("organizationId");

-- CreateIndex
CREATE INDEX "Creative_type_idx" ON "Creative"("type");

-- CreateIndex
CREATE INDEX "Creative_externalId_idx" ON "Creative"("externalId");

-- CreateIndex
CREATE INDEX "Creative_deletedAt_idx" ON "Creative"("deletedAt");

-- CreateIndex
CREATE INDEX "Creative_isActive_idx" ON "Creative"("isActive");

-- CreateIndex
CREATE INDEX "Creative_archivedAt_idx" ON "Creative"("archivedAt");

-- CreateIndex
CREATE INDEX "CreativeAsset_organizationId_idx" ON "CreativeAsset"("organizationId");

-- CreateIndex
CREATE INDEX "CreativeAsset_creativeId_idx" ON "CreativeAsset"("creativeId");

-- CreateIndex
CREATE INDEX "CreativeAsset_adId_idx" ON "CreativeAsset"("adId");

-- CreateIndex
CREATE INDEX "CreativeAsset_assetType_idx" ON "CreativeAsset"("assetType");

-- CreateIndex
CREATE INDEX "CreativeAsset_isPrimary_idx" ON "CreativeAsset"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_deletedAt_idx" ON "ApiKey"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_deletedAt_idx" ON "ApiKey"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_organizationId_name_deletedAt_key" ON "ApiKey"("organizationId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_status_idx" ON "Invitation"("organizationId", "email", "status");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConnection" ADD CONSTRAINT "PlatformConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConnection" ADD CONSTRAINT "PlatformConnection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_platformConnectionId_fkey" FOREIGN KEY ("platformConnectionId") REFERENCES "PlatformConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_platformConnectionId_fkey" FOREIGN KEY ("platformConnectionId") REFERENCES "PlatformConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
