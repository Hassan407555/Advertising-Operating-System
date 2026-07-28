-- H5: PublishJob relational integrity

-- Remove orphan jobs that would violate new FKs (backward-compatible cleanup).
DELETE FROM "PublishJob" AS job
WHERE NOT EXISTS (
  SELECT 1 FROM "Campaign" AS campaign WHERE campaign."id" = job."campaignId"
);

DELETE FROM "PublishJob" AS job
WHERE NOT EXISTS (
  SELECT 1 FROM "AdAccount" AS account WHERE account."id" = job."adAccountId"
);

UPDATE "PublishJob"
SET "requestedByUserId" = NULL
WHERE "requestedByUserId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS users WHERE users."id" = "PublishJob"."requestedByUserId"
  );

ALTER TABLE "PublishJob"
ADD CONSTRAINT "PublishJob_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishJob"
ADD CONSTRAINT "PublishJob_adAccountId_fkey"
FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishJob"
ADD CONSTRAINT "PublishJob_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PublishJob_adAccountId_idx"
ON "PublishJob"("adAccountId");
