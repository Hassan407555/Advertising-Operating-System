"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/shared/section-header";
import { isPublishActionId } from "@/features/campaign-readiness/constants/campaign-readiness.constants";
import type {
  CampaignReadinessChecklistItem,
  CampaignReadinessModel,
} from "@/features/campaign-readiness/types/campaign-readiness.types";
import { PUBLISHING_CHECKLIST_ANCHOR } from "@/lib/navigation/journey-return";
import { cn } from "@/lib/utils";

interface CampaignWorkflowCoachProps {
  readiness: CampaignReadinessModel;
  canPublish: boolean;
  publishing?: boolean;
  onPublish?: () => void;
  /** Refresh store capabilities after returning from a setup step. */
  onReturnedFromSetup?: () => void | Promise<void>;
}

function ChecklistRow({
  item,
  variant,
  emphasizeCurrent,
}: {
  item: CampaignReadinessChecklistItem;
  variant: "required" | "optional";
  emphasizeCurrent: boolean;
}) {
  const label = item.done ? item.label : item.actionLabel;
  const showEmphasis = item.isCurrent && emphasizeCurrent;
  const content = (
    <>
      {item.done ? (
        <CheckCircle2
          className={cn(
            "size-4 shrink-0",
            variant === "required" ? "text-muted-foreground" : "text-muted-foreground/80",
          )}
          aria-hidden
        />
      ) : (
        <Circle
          className={cn(
            "size-4 shrink-0",
            item.isCurrent ? "text-primary" : "text-muted-foreground/60",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">{label}</span>
      {item.isCurrent ? (
        <span className="shrink-0 rounded-[var(--radius-sm)] bg-primary-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-muted-foreground">
          Next
        </span>
      ) : null}
    </>
  );

  const rowClassName = cn(
    "flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-surface",
    item.done && "text-muted-foreground",
    !item.done && !item.isCurrent && "text-muted-foreground/80",
    item.isCurrent &&
      "bg-primary-muted font-medium text-foreground ring-1 ring-primary/40 border-l-2 border-l-primary pl-2",
    showEmphasis && "animate-pulse ring-2 ring-primary/50",
    !item.done && item.href && "hover:bg-muted/40",
  );

  if (!item.done && item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(rowClassName, "outline-none focus-visible:ring-2 focus-visible:ring-ring")}
          aria-current={item.isCurrent ? "step" : undefined}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className={rowClassName} aria-current={item.isCurrent ? "step" : undefined}>
      {content}
    </li>
  );
}

export function CampaignWorkflowCoach({
  readiness,
  canPublish,
  publishing = false,
  onPublish,
  onReturnedFromSetup,
}: CampaignWorkflowCoachProps) {
  const { next, flags, requiredSteps, optionalSteps } = readiness;
  const isLive = readiness.state === "LIVE";
  const showPublish = isPublishActionId(next.actionId) && flags.readyToPublish && !isLive;
  const { completedCount, totalCount, progressPercentage } = readiness;
  const [emphasizeCurrent, setEmphasizeCurrent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (hash !== PUBLISHING_CHECKLIST_ANCHOR) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      await onReturnedFromSetup?.();
      if (cancelled) {
        return;
      }

      const node = document.getElementById(PUBLISHING_CHECKLIST_ANCHOR);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
      setEmphasizeCurrent(true);

      window.setTimeout(() => {
        if (!cancelled) {
          setEmphasizeCurrent(false);
        }
      }, 2200);

      // Clear the hash so refresh does not re-trigger the focus animation.
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [onReturnedFromSetup]);

  return (
    <Card id={PUBLISHING_CHECKLIST_ANCHOR} className="scroll-mt-24 space-y-4">
      <SectionHeader
        title="Publishing Checklist"
        description="Complete each publishing prerequisite. Incomplete steps are clickable."
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Publishing Progress
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount} / {totalCount} completed · {progressPercentage}%
          </p>
        </div>
        <Progress
          value={progressPercentage}
          size="sm"
          label={`Publishing progress ${progressPercentage} percent`}
        />
      </div>

      <ol className="space-y-0.5" aria-label="Publishing checklist">
        {requiredSteps.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            variant="required"
            emphasizeCurrent={emphasizeCurrent}
          />
        ))}
      </ol>

      <Separator />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {showPublish || isLive ? next.nextAction : "Next Required Action"}
          </p>
          {showPublish ? (
            <p className="inline-flex items-center gap-1.5 text-body-sm text-foreground">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden />
              All publishing requirements completed.
            </p>
          ) : (
            <p className="text-body-sm">{next.message}</p>
          )}
        </div>

        {showPublish ? (
          <Button type="button" onClick={onPublish} disabled={!canPublish || publishing}>
            {publishing ? "Publishing…" : next.actionLabel ?? "Publish to Meta"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        ) : next.actionUrl ? (
          <Link href={next.actionUrl}>
            <Button type="button">
              {next.actionLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </div>

      {!isLive ? (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Optional Enhancements
              </p>
              <p className="text-body-sm text-muted-foreground">
                Improve campaign performance by configuring optional Meta features. These never block
                publishing.
              </p>
            </div>
            <ol className="space-y-0.5" aria-label="Optional enhancements">
              {optionalSteps.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  variant="optional"
                  emphasizeCurrent={false}
                />
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </Card>
  );
}
