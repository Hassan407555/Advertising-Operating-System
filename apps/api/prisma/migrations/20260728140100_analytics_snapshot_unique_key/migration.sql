-- C6: AnalyticsSnapshot integrity via deterministic uniqueKey + unique index

ALTER TABLE "AnalyticsSnapshot"
ADD COLUMN "uniqueKey" VARCHAR(512);

UPDATE "AnalyticsSnapshot" AS snapshots
SET "uniqueKey" = CONCAT_WS(
  '|',
  snapshots."organizationId",
  snapshots."platform"::text,
  snapshots."level"::text,
  to_char(snapshots."snapshotDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  COALESCE(snapshots."campaignId", ''),
  COALESCE(snapshots."adSetId", ''),
  COALESCE(snapshots."adId", ''),
  COALESCE(snapshots."creativeId", '')
);

-- Keep the newest row per grain; remove older duplicates before adding UNIQUE.
DELETE FROM "AnalyticsSnapshot" AS outdated
USING "AnalyticsSnapshot" AS newer
WHERE outdated."uniqueKey" = newer."uniqueKey"
  AND outdated."id" <> newer."id"
  AND (
    outdated."updatedAt" < newer."updatedAt"
    OR (
      outdated."updatedAt" = newer."updatedAt"
      AND outdated."id" < newer."id"
    )
  );

ALTER TABLE "AnalyticsSnapshot"
ALTER COLUMN "uniqueKey" SET NOT NULL;

CREATE UNIQUE INDEX "AnalyticsSnapshot_uniqueKey_key"
ON "AnalyticsSnapshot" ("uniqueKey");
