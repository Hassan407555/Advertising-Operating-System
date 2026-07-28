-- C5: Soft-delete-safe uniqueness for Campaign / AdSet / Ad
-- Replace full-table unique indexes with partial uniques on active rows only.

DROP INDEX IF EXISTS "Campaign_organizationId_adAccountId_externalId_key";
DROP INDEX IF EXISTS "Campaign_adAccountId_externalId_key";
DROP INDEX IF EXISTS "Campaign_organizationId_slug_key";

CREATE UNIQUE INDEX "Campaign_adAccountId_externalId_active_key"
ON "Campaign" ("adAccountId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Campaign_organizationId_adAccountId_externalId_active_key"
ON "Campaign" ("organizationId", "adAccountId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Campaign_organizationId_slug_active_key"
ON "Campaign" ("organizationId", "slug")
WHERE "deletedAt" IS NULL AND "slug" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Campaign_organizationId_adAccountId_externalId_idx"
ON "Campaign" ("organizationId", "adAccountId", "externalId");

CREATE INDEX IF NOT EXISTS "Campaign_adAccountId_externalId_idx"
ON "Campaign" ("adAccountId", "externalId");

CREATE INDEX IF NOT EXISTS "Campaign_organizationId_slug_idx"
ON "Campaign" ("organizationId", "slug");

DROP INDEX IF EXISTS "AdSet_organizationId_campaignId_externalId_key";
DROP INDEX IF EXISTS "AdSet_campaignId_externalId_key";

CREATE UNIQUE INDEX "AdSet_campaignId_externalId_active_key"
ON "AdSet" ("campaignId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "AdSet_organizationId_campaignId_externalId_active_key"
ON "AdSet" ("organizationId", "campaignId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "AdSet_organizationId_campaignId_externalId_idx"
ON "AdSet" ("organizationId", "campaignId", "externalId");

CREATE INDEX IF NOT EXISTS "AdSet_campaignId_externalId_idx"
ON "AdSet" ("campaignId", "externalId");

DROP INDEX IF EXISTS "Ad_organizationId_adSetId_externalId_key";
DROP INDEX IF EXISTS "Ad_adSetId_externalId_key";

CREATE UNIQUE INDEX "Ad_adSetId_externalId_active_key"
ON "Ad" ("adSetId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Ad_organizationId_adSetId_externalId_active_key"
ON "Ad" ("organizationId", "adSetId", "externalId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Ad_organizationId_adSetId_externalId_idx"
ON "Ad" ("organizationId", "adSetId", "externalId");

CREATE INDEX IF NOT EXISTS "Ad_adSetId_externalId_idx"
ON "Ad" ("adSetId", "externalId");
