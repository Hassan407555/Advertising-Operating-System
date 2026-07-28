"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { CampaignReviewForm } from "@/features/ai-sessions/components/campaign-review-form";
import {
  useAdvanceAiSessionMutation,
  useAiSessionQuery,
  useCancelAiSessionMutation,
  useGenerateAiSessionCampaignMutation,
  useResumeAiSessionMutation,
} from "@/features/ai-sessions/hooks/use-ai-sessions";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

function AiSessionDetails() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const sessionQuery = useAiSessionQuery(id);
  const advanceMutation = useAdvanceAiSessionMutation(id);
  const generateMutation = useGenerateAiSessionCampaignMutation(id);
  const resumeMutation = useResumeAiSessionMutation();
  const cancelMutation = useCancelAiSessionMutation();
  const [value, setValue] = useState("");

  const session = sessionQuery.data;
  const interviewActive =
    session?.status === "CREATED" ||
    session?.status === "AWAITING_INPUT" ||
    session?.status === "INTERVIEWING";
  const readyToGenerate = session?.status === "READY_FOR_ANALYSIS";
  const readyForReview = session?.status === "REVIEWING";
  const closed =
    session?.status === "FAILED" ||
    session?.status === "CANCELLED" ||
    session?.status === "ARCHIVED" ||
    session?.status === "APPROVED";

  const onAdvance = async () => {
    try {
      const updated = await advanceMutation.mutateAsync({ value });
      setValue("");
      if (updated.status === "READY_FOR_ANALYSIS") {
        toast.success("Interview completed.");
      } else {
        toast.success("Answer saved.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save interview answer."));
    }
  };

  const onGenerate = async () => {
    try {
      await generateMutation.mutateAsync();
      toast.success("Campaign generated. Ready for review.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Campaign generation failed."));
    }
  };

  const onResume = async () => {
    try {
      await resumeMutation.mutateAsync(id);
      toast.success("Interview resumed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to resume interview."));
    }
  };

  const onCancel = async () => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Session cancelled.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel session."));
    }
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Card className="space-y-3 p-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <PageError
        title="Session not found"
        message={getErrorMessage(sessionQuery.error, "This AI session could not be loaded.")}
        onRetry={() => sessionQuery.refetch()}
      />
    );
  }

  const generatedCampaign = session.workflowContext.generatedCampaign;
  const draftCampaignIds = session.workflowContext.draftCampaignIds;

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Session"
        description="Interview → Generate Campaign → Review → Draft"
        actions={
          <Link href={ROUTES.AI_SESSIONS} className="text-sm underline-offset-4 hover:underline">
            Back to AI Sessions
          </Link>
        }
      />

      <Card className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Status</span>
          <div className="mt-1">
            <StatusBadge status={session.status} />
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Phase</span>
          <p className="font-medium capitalize">
            {session.currentPhase.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Last activity</span>
          <p className="font-medium">{formatDateTime(session.lastActivityAt)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Product</span>
          <p className="font-medium font-mono text-xs">{session.productId}</p>
        </div>
        {session.errorMessage ? (
          <div className="md:col-span-2">
            <span className="text-muted-foreground">Error</span>
            <p className="font-medium text-destructive">{session.errorMessage}</p>
          </div>
        ) : null}
      </Card>

      {readyToGenerate ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Generate Campaign</h2>
          <p className="text-sm text-muted-foreground">
            Interview is complete. Generate a structured Meta campaign from product, analytics, store,
            and interview answers. No draft is saved until you finish Review.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating…" : "Generate Campaign"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {readyForReview && generatedCampaign ? (
        <CampaignReviewForm
          sessionId={session.id}
          campaignType={generatedCampaign.campaignType}
          payload={generatedCampaign.payload}
          model={generatedCampaign.model}
          draftCampaignIds={draftCampaignIds}
        />
      ) : null}

      {readyForReview && !generatedCampaign ? (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Campaign missing</h2>
          <p className="text-sm text-muted-foreground">
            This session is ready for review, but no generated campaign was found. Try generating again
            or start a new session from Products.
          </p>
          <Button type="button" onClick={onGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Generating…" : "Generate Campaign"}
          </Button>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">
          {interviewActive ? "Interview" : "Conversation"}
        </h2>
        <div className="space-y-2">
          {(session.messages ?? []).map((message) => (
            <div key={message.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {message.role === "ASSISTANT"
                    ? "Assistant"
                    : message.role === "USER"
                      ? "You"
                      : "System"}
                  {message.stepKey ? ` · ${message.stepKey}` : ""}
                </span>
                <span>{formatDateTime(message.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>

        {interviewActive ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="interview-answer">
              Interview answer
            </label>
            <input
              id="interview-answer"
              className="h-9 flex-1 rounded-md border border-border bg-transparent px-3 text-sm"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Answer current interview step"
            />
            <Button type="button" onClick={onAdvance} disabled={advanceMutation.isPending || !value.trim()}>
              {advanceMutation.isPending ? "Saving…" : "Continue"}
            </Button>
            <Button type="button" variant="secondary" onClick={onResume} disabled={resumeMutation.isPending}>
              Resume
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
              Cancel
            </Button>
          </div>
        ) : closed ? (
          <p className="text-sm text-muted-foreground">This session is closed.</p>
        ) : readyForReview ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
              Cancel session
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function AiSessionDetailsPage() {
  return (
    <RequireActiveStore>
      <AiSessionDetails />
    </RequireActiveStore>
  );
}
