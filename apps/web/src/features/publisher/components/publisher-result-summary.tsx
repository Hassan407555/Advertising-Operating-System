"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import type { PublishCampaignResponse } from "@/features/publisher/types/publisher.types";
import { formatDateTime } from "@/utils/formatters";

interface PublisherResultSummaryProps {
  result: PublishCampaignResponse;
  onRetry: () => void;
}

export function PublisherResultSummary({ result, onRetry }: PublisherResultSummaryProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Publish Result</h2>
        <p className="text-sm text-muted-foreground">
          Platform: {result.platform} • Status: {result.status} • Campaign: {result.campaignId}
        </p>
        <p className="text-xs text-muted-foreground">
          Started: {formatDateTime(result.startedAt)} • Completed: {formatDateTime(result.completedAt)} • Duration:{" "}
          {result.durationMs}ms
        </p>
        <p className="text-xs text-muted-foreground">
          External Campaign ID: {result.externalCampaignId ?? "N/A"}
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Published Entities</h3>
        {result.entities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No entity results returned.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            {result.entities.map((entity, index) => (
              <div key={`${entity.entityType}-${entity.entityId}-${index}`} className="rounded-md border border-border p-3">
                <div className="font-medium">
                  {entity.entityType} • {entity.status}
                </div>
                <div className="text-muted-foreground">
                  ID: {entity.entityId}
                  {entity.externalId ? ` • External ID: ${entity.externalId}` : ""}
                </div>
                {entity.message ? <div className="text-muted-foreground">{entity.message}</div> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Validation Issues</h3>
        {result.issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No validation issues reported.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {result.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="rounded-md border border-border p-3">
                <div className="font-medium">{issue.code}</div>
                <div className="text-muted-foreground">{issue.message}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={ROUTES.CAMPAIGN_DETAILS(result.campaignId)}>
          <Button type="button" variant="secondary">
            View Related Campaign
          </Button>
        </Link>
        <Button type="button" onClick={onRetry}>
          Retry Publish
        </Button>
      </div>
    </div>
  );
}
