-- CreateEnum
CREATE TYPE "AiSessionSource" AS ENUM ('PRODUCT_PAGE');

-- AlterTable
ALTER TABLE "AiSession"
ADD COLUMN "sessionSource" "AiSessionSource" NOT NULL DEFAULT 'PRODUCT_PAGE';
