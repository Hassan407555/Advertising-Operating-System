"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { AutomationRun } from "@/features/automation/types/automation.types";
import { formatDateTime } from "@/utils/formatters";

interface AutomationRunSummaryProps {
  run: AutomationRun;
  onRetry?: () => void;
}

export function AutomationRunSummary({ run, onRetry }: AutomationRunSummaryProps) {
  const completedSteps = run.steps.filter((step) => step.status === "COMPLETED").length;
  const failedSteps = run.steps.filter((step) => step.status === "FAILED").length;
  const skippedSteps = run.steps.filter((step) => step.status === "SKIPPED").length;
  const runningStep = run.steps.find((step) => step.status === "RUNNING");

  return (
    <Card className="space-y-3">
      <h2 className="text-xl font-semibold">Workflow Run Summary</h2>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Run ID:</span> {run.id}</p>
        <p><span className="text-muted-foreground">Pipeline ID:</span> {run.pipelineId}</p>
        <p><span className="text-muted-foreground">Trigger Type:</span> {run.triggerType}</p>
        <p><span className="text-muted-foreground">Status:</span> {run.status}</p>
        <p><span className="text-muted-foreground">Started:</span> {run.startedAt ? formatDateTime(run.startedAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Completed:</span> {run.completedAt ? formatDateTime(run.completedAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Current Step:</span> {runningStep ? `${runningStep.stepOrder} - ${runningStep.actionType}` : "N/A"}</p>
        <p><span className="text-muted-foreground">Duration:</span> {run.startedAt && run.completedAt ? `${new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()}ms` : "N/A"}</p>
      </div>
      {run.errorMessage ? <p className="text-sm text-red-400">Error: {run.errorMessage}</p> : null}
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-border p-2">Completed steps: {completedSteps}</div>
        <div className="rounded-md border border-border p-2">Failed steps: {failedSteps}</div>
        <div className="rounded-md border border-border p-2">Skipped steps: {skippedSteps}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={ROUTES.AUTOMATION_RUN_DETAILS(run.id)}>
          <Button type="button" variant="secondary">
            Open Run Details
          </Button>
        </Link>
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            Re-run Workflow
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
