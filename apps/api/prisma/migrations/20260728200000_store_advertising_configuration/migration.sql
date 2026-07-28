-- Store advertising configuration: Shopify store ↔ Meta resource IDs only
CREATE TABLE "StoreAdvertisingConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shopifyStoreId" TEXT NOT NULL,
    "metaPlatformConnectionId" TEXT,
    "metaBusinessId" VARCHAR(255),
    "adAccountId" TEXT,
    "facebookPageId" VARCHAR(255),
    "instagramAccountId" VARCHAR(255),
    "pixelId" VARCHAR(255),
    "catalogId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAdvertisingConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreAdvertisingConfiguration_shopifyStoreId_key" ON "StoreAdvertisingConfiguration"("shopifyStoreId");
CREATE INDEX "StoreAdvertisingConfiguration_organizationId_idx" ON "StoreAdvertisingConfiguration"("organizationId");
CREATE INDEX "StoreAdvertisingConfiguration_metaPlatformConnectionId_idx" ON "StoreAdvertisingConfiguration"("metaPlatformConnectionId");
CREATE INDEX "StoreAdvertisingConfiguration_adAccountId_idx" ON "StoreAdvertisingConfiguration"("adAccountId");

ALTER TABLE "StoreAdvertisingConfiguration" ADD CONSTRAINT "StoreAdvertisingConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreAdvertisingConfiguration" ADD CONSTRAINT "StoreAdvertisingConfiguration_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "PlatformConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreAdvertisingConfiguration" ADD CONSTRAINT "StoreAdvertisingConfiguration_metaPlatformConnectionId_fkey" FOREIGN KEY ("metaPlatformConnectionId") REFERENCES "PlatformConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoreAdvertisingConfiguration" ADD CONSTRAINT "StoreAdvertisingConfiguration_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
