-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REPORT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULED';

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'REPORT';
