"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import type { SyncResultResponse } from "@/features/synchronization/types/synchronization.types";
import { formatDateTime } from "@/utils/formatters";

interface SynchronizationResultSummaryProps {
  result: SyncResultResponse;
  onRetry: () => void;
}

export function SynchronizationResultSummary({ result, onRetry }: SynchronizationResultSummaryProps) {
  const updatedEntities = result.entities.filter((entity) => entity.changeType === "UPDATED").length;
  const skippedEntities = result.entities.filter((entity) => entity.changeType === "UNCHANGED").length;
  const failedEntities = result.entities.filter((entity) => entity.changeType === "FAILED").length;

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Synchronization Result</h2>
        <p className="text-sm text-muted-foreground">
          Status: {result.status} • Platform: {result.platform} • Scope: {result.scope}
        </p>
        <p className="text-xs text-muted-foreground">
          Scope ID: {result.scopeId} • Started: {formatDateTime(result.startedAt)} • Completed: {formatDateTime(result.completedAt)}
        </p>
        <p className="text-xs text-muted-foreground">Duration: {result.durationMs}ms</p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Summary Counts</h3>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">Updated: {updatedEntities}</div>
          <div className="rounded-md border border-border p-3">Skipped: {skippedEntities}</div>
          <div className="rounded-md border border-border p-3">Failed: {failedEntities}</div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Entity Changes</h3>
        {result.entities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No entity changes returned by backend.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            {result.entities.map((entity, index) => (
              <div key={`${entity.entityType}-${entity.entityId}-${index}`} className="rounded-md border border-border p-3">
                <div className="font-medium">
                  {entity.entityType} • {entity.changeType}
                </div>
                <div className="text-muted-foreground">
                  ID: {entity.entityId}
                  {entity.externalId ? ` • External ID: ${entity.externalId}` : ""}
                </div>
                <div className="text-muted-foreground">
                  Fields updated: {entity.fieldsUpdated.length ? entity.fieldsUpdated.join(", ") : "None"}
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
          <details className="mt-2 rounded-md border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Expand issues ({result.issues.length})</summary>
            <ul className="mt-2 space-y-2">
              {result.issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`} className="rounded-md border border-border p-2">
                  <div className="font-medium">{issue.code}</div>
                  <div className="text-muted-foreground">{issue.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {issue.entityType ? `Entity: ${issue.entityType}` : "Entity: N/A"}{" "}
                    {issue.entityId ? `• ID: ${issue.entityId}` : ""}{" "}
                    {issue.field ? `• Field: ${issue.field}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {result.scope === "CAMPAIGN" ? (
          <Link href={ROUTES.CAMPAIGN_DETAILS(result.scopeId)}>
            <Button type="button" variant="secondary">
              View Synchronized Campaign
            </Button>
          </Link>
        ) : null}
        <Button type="button" onClick={onRetry}>
          Retry Synchronization
        </Button>
      </div>
    </div>
  );
}
