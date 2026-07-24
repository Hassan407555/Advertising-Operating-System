/*
  Warnings:

  - You are about to drop the column `order` on the `CreativeAsset` table. All the data in the column will be lost.
  - You are about to alter the column `duration` on the `CreativeAsset` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - Added the required column `extension` to the `CreativeAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `CreativeAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `CreativeAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFileName` to the `CreativeAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `CreativeAsset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'R2', 'MINIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_PRIMARY_SET';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ASSET_REORDERED';

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'CREATIVE_ASSET';

-- AlterTable
ALTER TABLE "CreativeAsset" DROP COLUMN "order",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "checksum" VARCHAR(128),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extension" VARCHAR(20) NOT NULL,
ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "mimeType" VARCHAR(255) NOT NULL,
ADD COLUMN     "originalFileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "storageKey" VARCHAR(1000) NOT NULL,
ADD COLUMN     "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "fileSize" SET DEFAULT 0,
ALTER COLUMN "fileSize" SET DATA TYPE BIGINT,
ALTER COLUMN "duration" SET DATA TYPE DECIMAL(10,3);

-- CreateIndex
CREATE INDEX "CreativeAsset_organizationId_deletedAt_idx" ON "CreativeAsset"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "CreativeAsset_organizationId_creativeId_idx" ON "CreativeAsset"("organizationId", "creativeId");

-- CreateIndex
CREATE INDEX "CreativeAsset_storageProvider_idx" ON "CreativeAsset"("storageProvider");

-- CreateIndex
CREATE INDEX "CreativeAsset_displayOrder_idx" ON "CreativeAsset"("displayOrder");

-- CreateIndex
CREATE INDEX "CreativeAsset_deletedAt_idx" ON "CreativeAsset"("deletedAt");

-- CreateIndex
CREATE INDEX "CreativeAsset_archivedAt_idx" ON "CreativeAsset"("archivedAt");
