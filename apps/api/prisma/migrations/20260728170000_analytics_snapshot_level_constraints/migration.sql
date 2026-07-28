-- Production hardening: prevent structurally invalid AnalyticsSnapshot rows.
-- Enforces hierarchy and level-specific entity grain integrity.

ALTER TABLE "AnalyticsSnapshot"
ADD CONSTRAINT "AnalyticsSnapshot_entity_hierarchy_check"
CHECK (
  ("adSetId" IS NULL OR "campaignId" IS NOT NULL)
  AND ("adId" IS NULL OR ("adSetId" IS NOT NULL AND "campaignId" IS NOT NULL))
);

ALTER TABLE "AnalyticsSnapshot"
ADD CONSTRAINT "AnalyticsSnapshot_level_entity_consistency_check"
CHECK (
  ("level" = 'CAMPAIGN' AND "campaignId" IS NOT NULL AND "adSetId" IS NULL AND "adId" IS NULL AND "creativeId" IS NULL)
  OR ("level" = 'AD_SET' AND "campaignId" IS NOT NULL AND "adSetId" IS NOT NULL AND "adId" IS NULL AND "creativeId" IS NULL)
  OR ("level" = 'AD' AND "campaignId" IS NOT NULL AND "adSetId" IS NOT NULL AND "adId" IS NOT NULL AND "creativeId" IS NULL)
  OR ("level" = 'CREATIVE' AND "creativeId" IS NOT NULL)
);
