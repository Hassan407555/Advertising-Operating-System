-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_SET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_SET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_SET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_SET_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_SET_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'AD_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATIVE_RESTORED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'AD_SET';
ALTER TYPE "AuditEntity" ADD VALUE 'AD';
