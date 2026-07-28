"use client";

import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { useAutomationRunDetailsQuery } from "@/features/automation/hooks/use-automation";
import { AutomationRunSummary } from "@/features/automation/components/automation-run-summary";
import { AutomationStepsList } from "@/features/automation/components/automation-steps-list";
import { getErrorMessage } from "@/utils/errors";

interface AutomationRunDetailsPageProps {
  id: string;
}

export function AutomationRunDetailsPage({ id }: AutomationRunDetailsPageProps) {
  const canView = usePermission("view");
  const runQuery = useAutomationRunDetailsQuery(id);

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to automation run details." />;
  }

  if (runQuery.isError) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load automation run</h2>
        <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(runQuery.error)}</p>
      </Card>
    );
  }

  if (!runQuery.data) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Loading automation run details...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AutomationRunSummary run={runQuery.data} />
      <AutomationStepsList steps={runQuery.data.steps} />
    </div>
  );
}
