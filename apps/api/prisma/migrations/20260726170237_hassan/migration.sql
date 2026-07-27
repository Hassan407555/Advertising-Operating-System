-- CreateEnum
CREATE TYPE "ShopifyProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "PlatformType" ADD VALUE 'SHOPIFY';

-- CreateTable
CREATE TABLE "ShopifyProduct" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platformConnectionId" TEXT NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "handle" VARCHAR(255) NOT NULL,
    "vendor" VARCHAR(255),
    "productType" VARCHAR(255),
    "description" TEXT,
    "status" "ShopifyProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[],
    "featuredImageUrl" VARCHAR(2000),
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "sku" VARCHAR(100),
    "barcode" VARCHAR(100),
    "price" DECIMAL(18,2),
    "compareAtPrice" DECIMAL(18,2),
    "inventoryQuantity" INTEGER,
    "option1" VARCHAR(255),
    "option2" VARCHAR(255),
    "option3" VARCHAR(255),
    "weight" DECIMAL(10,3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "url" VARCHAR(2000) NOT NULL,
    "alt" VARCHAR(500),
    "width" INTEGER,
    "height" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyProduct_organizationId_idx" ON "ShopifyProduct"("organizationId");

-- CreateIndex
CREATE INDEX "ShopifyProduct_organizationId_deletedAt_idx" ON "ShopifyProduct"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ShopifyProduct_platformConnectionId_idx" ON "ShopifyProduct"("platformConnectionId");

-- CreateIndex
CREATE INDEX "ShopifyProduct_externalId_idx" ON "ShopifyProduct"("externalId");

-- CreateIndex
CREATE INDEX "ShopifyProduct_status_idx" ON "ShopifyProduct"("status");

-- CreateIndex
CREATE INDEX "ShopifyProduct_deletedAt_idx" ON "ShopifyProduct"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyProduct_platformConnectionId_externalId_key" ON "ShopifyProduct"("platformConnectionId", "externalId");

-- CreateIndex
CREATE INDEX "ShopifyVariant_productId_idx" ON "ShopifyVariant"("productId");

-- CreateIndex
CREATE INDEX "ShopifyVariant_sku_idx" ON "ShopifyVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyVariant_productId_externalId_key" ON "ShopifyVariant"("productId", "externalId");

-- CreateIndex
CREATE INDEX "ShopifyImage_productId_idx" ON "ShopifyImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyImage_productId_externalId_key" ON "ShopifyImage"("productId", "externalId");

-- AddForeignKey
ALTER TABLE "ShopifyProduct" ADD CONSTRAINT "ShopifyProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyProduct" ADD CONSTRAINT "ShopifyProduct_platformConnectionId_fkey" FOREIGN KEY ("platformConnectionId") REFERENCES "PlatformConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyVariant" ADD CONSTRAINT "ShopifyVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopifyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyImage" ADD CONSTRAINT "ShopifyImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopifyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
