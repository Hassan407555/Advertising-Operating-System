"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { useAutomationRunsQuery } from "@/features/automation/hooks/use-automation";
import type { AutomationRunStatus } from "@/features/automation/types/automation.types";
import { formatDateTime } from "@/utils/formatters";
import { getErrorMessage } from "@/utils/errors";

export function AutomationRunsPageContent() {
  const canView = usePermission("view");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AutomationRunStatus | "">("");
  const [limit] = useState(20);
  const query = useAutomationRunsQuery({
    page,
    limit,
    status: status || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to automation runs." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automation Runs</h1>
        <p className="text-sm text-muted-foreground">Monitor workflow execution history and open full run details.</p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 min-w-[220px] rounded-md border border-border bg-transparent px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus((event.target.value || "") as AutomationRunStatus | "");
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <Button type="button" variant="secondary" onClick={() => query.refetch()}>
            Refresh
          </Button>
        </div>
      </Card>

      {query.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load automation runs</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(query.error)}</p>
          <Button className="mt-3" type="button" onClick={() => query.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {(query.data?.data.length ?? 0) === 0 ? (
        <PageEmpty title="No automation runs" description="No run history is available for the selected filters." />
      ) : (
        <div className="space-y-2">
          {query.data?.data.map((run) => (
            <Card key={run.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Run {run.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {run.status} • Trigger: {run.triggerType} • Started: {run.startedAt ? formatDateTime(run.startedAt) : "N/A"}
                  </p>
                </div>
                <Link href={ROUTES.AUTOMATION_RUN_DETAILS(run.id)}>
                  <Button type="button" variant="secondary">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {query.data ? (
        <DataTablePagination
          page={query.data.meta.page}
          limit={query.data.meta.limit}
          total={query.data.meta.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
