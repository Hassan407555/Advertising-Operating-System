"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DashboardOnboardingState } from "@/features/dashboard/lib/dashboard-onboarding";

interface DashboardOnboardingCardProps {
  onboarding: DashboardOnboardingState;
}

export function DashboardOnboardingCard({ onboarding }: DashboardOnboardingCardProps) {
  const { milestones, completedCount, totalCount, percentComplete, nextMilestone } = onboarding;

  return (
    <section aria-labelledby="dashboard-onboarding-heading">
      <Card variant="elevated" padding="lg" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-eyebrow">Setup progress</p>
            <h2 id="dashboard-onboarding-heading" className="mt-1 text-heading">
              Getting Started
            </h2>
            <p className="mt-1 text-body-sm">
              Complete every milestone to unlock the full AI Meta Ads workflow.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {percentComplete}%
            </p>
            <p className="text-caption">
              {completedCount} of {totalCount} complete
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={percentComplete} label="Onboarding setup progress" />
          {nextMilestone ? (
            <p className="text-caption">
              Next up: <span className="text-foreground">{nextMilestone.title}</span>
            </p>
          ) : null}
        </div>

        <ol className="grid gap-3 lg:grid-cols-2">
          {milestones.map((step, index) => {
            const isNext = nextMilestone?.id === step.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex gap-3 rounded-[var(--radius-xl)] p-4 transition-surface",
                  step.done && "bg-success-muted/60 shadow-[var(--shadow-xs)]",
                  !step.done && isNext && "bg-primary-muted/50 ring-1 ring-primary/25",
                  !step.done && !isNext && "bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done && "bg-success/20 text-success",
                    !step.done && isNext && "bg-primary/20 text-primary ring-1 ring-primary/30",
                    !step.done && !isNext && "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="size-4" /> : index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium tracking-tight text-foreground">{step.title}</p>
                    {step.done ? (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-success">
                        Done
                      </span>
                    ) : isNext ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-primary-muted-foreground">
                        <Circle className="size-2 fill-current" aria-hidden />
                        Next
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-body-sm">{step.description}</p>
                  {!step.done ? (
                    <Link href={step.href} className="mt-3 inline-flex">
                      <Button size="sm" variant={isNext ? "default" : "secondary"} className="gap-1.5">
                        {step.cta}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
