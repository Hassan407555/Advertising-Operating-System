"use client";

import { Card } from "@/components/ui/card";
import type { AutomationStep } from "@/features/automation/types/automation.types";
import { formatDateTime } from "@/utils/formatters";

interface AutomationStepsListProps {
  steps: AutomationStep[];
}

export function AutomationStepsList({ steps }: AutomationStepsListProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">No step data returned by backend.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-semibold">Execution Steps</h3>
      <div className="space-y-2">
        {steps
          .slice()
          .sort((a, b) => a.stepOrder - b.stepOrder)
          .map((step) => (
            <details key={step.id} className="rounded-md border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Step {step.stepOrder}: {step.actionType} • {step.status}
              </summary>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>Started: {step.startedAt ? formatDateTime(step.startedAt) : "N/A"}</p>
                <p>Completed: {step.completedAt ? formatDateTime(step.completedAt) : "N/A"}</p>
                {step.errorMessage ? <p className="text-red-400">Error: {step.errorMessage}</p> : null}
                <p>Input: {step.input ? JSON.stringify(step.input) : "N/A"}</p>
                <p>Output: {step.output ? JSON.stringify(step.output) : "N/A"}</p>
              </div>
            </details>
          ))}
      </div>
    </Card>
  );
}
