"use client";

import Link from "next/link";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useAiSessionsQuery } from "@/features/ai-sessions/hooks/use-ai-sessions";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

function AiSessionsList() {
  const { activeStore } = useActiveStore();
  const listQuery = useAiSessionsQuery({ storeId: activeStore?.id, limit: 50 });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <PageHeader
          title="AI Sessions"
          description={`Interview and generation sessions for store ${activeStore?.name ?? ""}.`}
        />
        <Card className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="AI Sessions"
          description={`Interview and generation sessions for store ${activeStore?.name ?? ""}.`}
        />
        <PageError
          title="Unable to load AI sessions"
          message={getErrorMessage(listQuery.error, "AI sessions could not be loaded.")}
          onRetry={() => listQuery.refetch()}
        />
      </div>
    );
  }

  const rows = listQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Sessions"
        description={`Interview, generate, and review Meta campaigns for store ${activeStore?.name ?? ""}.`}
        actions={
          <Link href={ROUTES.PRODUCTS}>
            <Button variant="secondary">Generate AI Campaign</Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <PageEmpty
          title="No AI sessions"
          description="Start from Products to run an interview and generate a Meta campaign draft."
          action={
            <Link href={ROUTES.PRODUCTS}>
              <Button>Open Products</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">AI sessions for the active store</caption>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((session) => (
                <tr key={session.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {session.currentPhase.replaceAll("_", " ").toLowerCase()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground" title={session.productId}>
                    {shortId(session.productId)}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(session.lastActivityAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={ROUTES.AI_SESSION_DETAILS(session.id)}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function AiSessionsPage() {
  return (
    <RequireActiveStore>
      <AiSessionsList />
    </RequireActiveStore>
  );
}
