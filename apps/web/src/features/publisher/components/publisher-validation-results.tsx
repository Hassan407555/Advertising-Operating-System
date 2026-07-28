"use client";

import { Card } from "@/components/ui/card";
import type { PublishValidationResponse } from "@/features/publisher/types/publisher.types";

interface PublisherValidationResultsProps {
  validation: PublishValidationResponse;
}

export function PublisherValidationResults({ validation }: PublisherValidationResultsProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Validation Results</h2>
      <p className="text-sm text-muted-foreground">
        Platform: {validation.platform} • {validation.valid ? "Validation passed" : "Validation failed"}
      </p>
      {validation.issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No validation issues returned by backend.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {validation.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className="rounded-md border border-border p-3">
              <div className="font-medium">{issue.code}</div>
              <div className="text-muted-foreground">{issue.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {issue.entityType ? `Entity: ${issue.entityType}` : "Entity: N/A"}{" "}
                {issue.entityId ? `• ID: ${issue.entityId}` : ""}{" "}
                {issue.field ? `• Field: ${issue.field}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
