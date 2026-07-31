"use client";

import Link from "next/link";
import { ArrowRight, Bot, MessageSquare, Sparkles, Zap } from "lucide-react";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useAiSessionsQuery } from "@/features/ai-sessions/hooks/use-ai-sessions";
import type { AiSession } from "@/features/ai-sessions/types/ai-session.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

const STEP_ORDER = [
  "Interview",
  "Generate",
  "Review",
  "Draft",
] as const;

function sessionProgressLabel(session: AiSession) {
  const status = session.status;
  if (status === "REVIEWING" || status === "AWAITING_APPROVAL") return "Review";
  if (status === "READY_FOR_ANALYSIS" || status === "ANALYZING" || status === "PLANNING" || status === "BUILDING") {
    return "Generate";
  }
  if (status === "APPROVED" || status === "ARCHIVED") return "Draft";
  if (status === "FAILED" || status === "CANCELLED") return status === "FAILED" ? "Failed" : "Cancelled";
  return "Interview";
}

function progressIndex(label: string) {
  const idx = STEP_ORDER.indexOf(label as (typeof STEP_ORDER)[number]);
  return idx < 0 ? 0 : idx;
}

function SessionCard({ session }: { session: AiSession }) {
  const step = sessionProgressLabel(session);
  const stepIdx = progressIndex(step);
  const productLabel =
    (typeof session.workflowContext.productTitle === "string" && session.workflowContext.productTitle) ||
    `Product ${session.productId.slice(0, 8)}…`;

  return (
    <Link
      href={ROUTES.AI_SESSION_DETAILS(session.id)}
      className="block rounded-[var(--radius-xl)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <Card
        variant="default"
        padding="default"
        className="h-full transition-surface hover:shadow-[var(--shadow-elevated)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-primary-muted text-primary">
            <Bot className="size-4" aria-hidden />
          </div>
          <StatusBadge status={session.status} />
        </div>

        <h3 className="mt-4 truncate text-subheading">{productLabel}</h3>
        <p className="mt-1 text-caption capitalize">
          {session.currentPhase.replaceAll("_", " ").toLowerCase()}
        </p>

        <ol className="mt-4 flex items-center gap-1.5" aria-label={`Progress: ${step}`}>
          {STEP_ORDER.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index <= stepIdx ? "bg-primary" : "bg-muted",
                )}
                title={label}
              />
            </li>
          ))}
        </ol>
        <p className="mt-2 text-caption">
          Step: <span className="text-foreground">{step}</span>
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <span className="text-caption">{formatDateTime(session.lastActivityAt)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Resume
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function AiSessionsList() {
  const { activeStore } = useActiveStore();
  const listQuery = useAiSessionsQuery({ storeId: activeStore?.id, limit: 50 });

  if (listQuery.isLoading) {
    return (
      <div className="page-stack" aria-busy="true">
        <PageHeader
          eyebrow="AI Studio"
          title="AI Sessions"
          description={`Interview and generation sessions for ${activeStore?.name ?? "this store"}.`}
        />
        <PageGrid cols={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="space-y-3">
              <Skeleton className="size-10 rounded-[var(--radius-md)]" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </PageGrid>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="AI Studio" title="AI Sessions" />
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
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="AI Studio"
        title="AI Sessions"
        description={`Interview, generate, and review Meta campaigns for ${activeStore?.name ?? "this store"}.`}
        actions={
          <Link href={ROUTES.PRODUCTS}>
            <Button variant="secondary" className="gap-1.5">
              <Zap className="size-3.5" aria-hidden />
              Generate Campaign
            </Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <PageEmpty
          title="No interviews"
          description="Start from Products to run an AI interview and generate a Meta campaign draft."
          icon={<MessageSquare className="size-5" aria-hidden />}
          action={
            <Link href={ROUTES.PRODUCTS}>
              <Button className="gap-1.5">
                <Sparkles className="size-3.5" aria-hidden />
                Browse Products
              </Button>
            </Link>
          }
        />
      ) : (
        <PageGrid cols={3}>
          {rows.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </PageGrid>
      )}
    </div>
  );
}

export function AiSessionsPage() {
  return (
    <RequireActiveStore
      emptyTitle="No interviews yet"
      emptyDescription="Connect a store under Commerce, then start an interview from Products."
    >
      <AiSessionsList />
    </RequireActiveStore>
  );
}
