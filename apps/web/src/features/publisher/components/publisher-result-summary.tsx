"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import {
  PUBLISH_STAGE_TITLES,
  getPublishFailureTitle,
  type PublishCampaignResponse,
  type PublishStageLog,
} from "@/features/publisher/types/publisher.types";
import { formatDateTime } from "@/utils/formatters";

interface PublisherResultSummaryProps {
  result: PublishCampaignResponse;
  onRetry: () => void;
}

function stageMarker(status: PublishStageLog["status"]): string {
  switch (status) {
    case "succeeded":
      return "✓";
    case "failed":
      return "✗";
    case "skipped":
      return "–";
    default:
      return "…";
  }
}

function stageTitle(entry: PublishStageLog): string {
  const titles = PUBLISH_STAGE_TITLES[entry.stage];
  if (!titles) {
    return entry.stage;
  }
  if (entry.status === "failed") {
    return titles.failed;
  }
  if (entry.status === "skipped") {
    return titles.success.replace("Complete", "Skipped").replace("Created", "Skipped");
  }
  return titles.success;
}

export function PublisherResultSummary({ result, onRetry }: PublisherResultSummaryProps) {
  const diagnostics = result.diagnostics;
  const failedStage = diagnostics?.stages.find((stage) => stage.status === "failed");
  const isFailure = !result.success || result.status === "FAILED" || result.status === "PARTIAL";
  const failureTitle = getPublishFailureTitle(diagnostics);
  const metaError = failedStage?.metaError ?? null;
  const errorDetail =
    diagnostics?.errorMessage?.trim() ||
    failedStage?.message?.trim() ||
    result.issues.find((issue) => issue.message.trim())?.message.trim();

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
        {result.externalCampaignId ? (
          <p className="text-sm">
            <a
              className="text-primary underline underline-offset-2"
              href={`https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${encodeURIComponent(result.externalCampaignId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Meta Ads Manager
            </a>
          </p>
        ) : null}
        {isFailure && errorDetail ? (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-medium text-destructive">{failureTitle}</div>
            <div className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground">Meta Error:</span> {errorDetail}
            </div>
            {diagnostics?.errorCode ? (
              <div className="mt-1 text-xs text-muted-foreground">Code: {diagnostics.errorCode}</div>
            ) : null}
            {diagnostics?.metaTraceId || metaError?.fbtraceId ? (
              <div className="mt-1 text-xs text-muted-foreground">
                fbtrace_id: {diagnostics?.metaTraceId ?? metaError?.fbtraceId}
              </div>
            ) : null}
            {diagnostics?.httpStatus || metaError?.httpStatus ? (
              <div className="mt-1 text-xs text-muted-foreground">
                HTTP: {diagnostics?.httpStatus ?? metaError?.httpStatus}
                {diagnostics?.graphErrorCode != null
                  ? ` • Graph code: ${diagnostics.graphErrorCode}`
                  : metaError?.code != null
                    ? ` • Graph code: ${metaError.code}`
                    : ""}
                {diagnostics?.graphErrorSubcode != null
                  ? ` • Subcode: ${diagnostics.graphErrorSubcode}`
                  : metaError?.errorSubcode != null
                    ? ` • Subcode: ${metaError.errorSubcode}`
                    : ""}
              </div>
            ) : null}
            {diagnostics?.retryable != null ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Retryable: {diagnostics.retryable ? "yes" : "no"}
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      {diagnostics && diagnostics.stages.length > 0 ? (
        <Card>
          <h3 className="text-lg font-semibold">Publishing Progress</h3>
          <div className="mt-2 space-y-2 text-sm">
            {diagnostics.stages.map((entry, index) => (
              <div
                key={`${entry.stage}-${entry.startedAt}-${index}`}
                className={`rounded-md border p-3 ${
                  entry.status === "failed"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border"
                }`}
              >
                <div className="font-medium">
                  {stageMarker(entry.status)} {stageTitle(entry)}
                  {entry.durationMs != null ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({entry.durationMs}ms)
                    </span>
                  ) : null}
                </div>
                {entry.status === "failed" && (entry.message || entry.metaError) ? (
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Meta returned:</span>{" "}
                      {entry.message || entry.metaError?.message}
                    </div>
                    {entry.metaError?.fbtraceId ? (
                      <div className="text-xs">fbtrace_id: {entry.metaError.fbtraceId}</div>
                    ) : null}
                    {entry.metaError?.httpStatus ? (
                      <div className="text-xs">
                        HTTP {entry.metaError.httpStatus}
                        {entry.metaError.code != null ? ` • (#${entry.metaError.code})` : ""}
                      </div>
                    ) : null}
                  </div>
                ) : entry.message && entry.status !== "succeeded" ? (
                  <div className="mt-1 text-xs text-muted-foreground">{entry.message}</div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
        <h3 className="text-lg font-semibold">Issues</h3>
        {result.issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No issues reported.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {result.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="rounded-md border border-border p-3">
                <div className="font-medium">{issue.code}</div>
                <div className="text-muted-foreground whitespace-pre-line">{issue.message}</div>
                {issue.field ? (
                  <div className="mt-1 text-xs text-muted-foreground">Stage: {issue.field}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={ROUTES.ANALYTICS}>
          <Button type="button">
            View Analytics
          </Button>
        </Link>
        <Link href={ROUTES.CAMPAIGN_DETAILS(result.campaignId)}>
          <Button type="button" variant="secondary">
            Back to Campaign
          </Button>
        </Link>
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry Publish
        </Button>
      </div>
    </div>
  );
}
