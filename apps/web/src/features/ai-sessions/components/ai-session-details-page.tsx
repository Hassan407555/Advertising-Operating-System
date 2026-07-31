"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { CampaignReviewForm } from "@/features/ai-sessions/components/campaign-review-form";
import {
  useAdvanceAiSessionMutation,
  useAiSessionQuery,
  useCancelAiSessionMutation,
  useGenerateAiSessionCampaignMutation,
  useGenerateAiSessionVideoMutation,
  useResumeAiSessionMutation,
} from "@/features/ai-sessions/hooks/use-ai-sessions";
import type {
  AiSession,
  GeneratedVideoPreview,
} from "@/features/ai-sessions/types/ai-session.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

const PIPELINE = ["Interview", "Generate", "Review", "Done"] as const;

type VideoGenerationPhase = "idle" | "generating" | "ready" | "error";

function pipelineIndex(session: AiSession) {
  const s = session.status;
  if (s === "APPROVED" || s === "ARCHIVED") return 3;
  if (s === "REVIEWING" || s === "AWAITING_APPROVAL") return 2;
  if (
    s === "READY_FOR_ANALYSIS" ||
    s === "ANALYZING" ||
    s === "PLANNING" ||
    s === "BUILDING" ||
    s === "FAILED"
  ) {
    return 1;
  }
  return 0;
}

function AiSessionDetails() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const sessionQuery = useAiSessionQuery(id);
  const advanceMutation = useAdvanceAiSessionMutation(id);
  const generateMutation = useGenerateAiSessionCampaignMutation(id);
  const generateVideoMutation = useGenerateAiSessionVideoMutation(id);
  const resumeMutation = useResumeAiSessionMutation();
  const cancelMutation = useCancelAiSessionMutation();
  const [value, setValue] = useState("");
  const [videoPreview, setVideoPreview] = useState<GeneratedVideoPreview | null>(null);
  const [videoPhase, setVideoPhase] = useState<VideoGenerationPhase>("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const session = sessionQuery.data;
  const interviewActive =
    session?.status === "CREATED" ||
    session?.status === "AWAITING_INPUT" ||
    session?.status === "INTERVIEWING";
  const readyToGenerate = session?.status === "READY_FOR_ANALYSIS";
  const readyForReview = session?.status === "REVIEWING";
  const generationFailed = session?.status === "FAILED";
  const closed =
    session?.status === "CANCELLED" ||
    session?.status === "ARCHIVED" ||
    session?.status === "APPROVED";

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [session?.messages?.length, session?.status]);

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

  const runVideoGeneration = async () => {
    setVideoPhase("generating");
    setVideoError(null);
    setVideoPreview(null);
    try {
      const result = await generateVideoMutation.mutateAsync();
      setVideoPreview(result.media);
      setVideoPhase("ready");
      toast.success("Video ready.");
    } catch (error) {
      const message = getErrorMessage(error, "Video generation failed.");
      setVideoError(message);
      setVideoPhase("error");
      toast.error(message);
    }
  };

  const onGenerate = async () => {
    try {
      setVideoPreview(null);
      setVideoPhase("idle");
      setVideoError(null);
      const updated = await generateMutation.mutateAsync();
      toast.success("Campaign generated.");
      queueMicrotask(() => {
        reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const campaignType = updated.workflowContext.generatedCampaign?.campaignType;
      if (campaignType === "VIDEO") {
        await runVideoGeneration();
      }
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
      void router.push(ROUTES.AI_SESSIONS);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel session."));
    }
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="page-stack" aria-busy="true">
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
  const interviewAnswers = session.workflowContext.answers ?? {};
  const selectedAdType = String(interviewAnswers.adType ?? "").toUpperCase();
  const isVideoCampaign =
    selectedAdType === "VIDEO" || generatedCampaign?.campaignType === "VIDEO";
  const isBusy =
    generateMutation.isPending ||
    generateVideoMutation.isPending ||
    videoPhase === "generating";
  const generateLabel = generateMutation.isPending
    ? "Generating Campaign…"
    : generationFailed
      ? "Retry Generate"
      : "Generate Campaign";
  const draftCampaignIds = session.workflowContext.draftCampaignIds;
  const stepIdx = pipelineIndex(session);
  const percent = Math.round(((stepIdx + 1) / PIPELINE.length) * 100);

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="AI Studio"
        title="AI Session"
        description="Interview → Generate Campaign → Review → Draft"
        actions={
          <Link href={ROUTES.AI_SESSIONS}>
            <Button variant="ghost" size="sm">
              Back to sessions
            </Button>
          </Link>
        }
      />

      <Card variant="elevated" padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionHeader
              size="sm"
              title="Session progress"
              description={`Phase: ${session.currentPhase.replaceAll("_", " ").toLowerCase()}`}
            />
          </div>
          <StatusBadge status={session.status} />
        </div>
        <Progress value={percent} label="AI session progress" />
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PIPELINE.map((label, index) => (
            <li
              key={label}
              className={cn(
                "rounded-[var(--radius-lg)] px-3 py-2 text-center text-xs font-medium",
                index < stepIdx && "bg-success-muted/50 text-success",
                index === stepIdx && "bg-primary-muted text-primary-muted-foreground",
                index > stepIdx && "bg-muted/40 text-muted-foreground",
              )}
            >
              {label}
            </li>
          ))}
        </ol>
        <p className="text-caption">
          Last activity {formatDateTime(session.lastActivityAt)} · Product{" "}
          <span className="font-mono text-[11px] text-foreground">{session.productId}</span>
        </p>
        {session.errorMessage ? (
          <p className="text-sm text-destructive">{session.errorMessage}</p>
        ) : null}
      </Card>

      {readyToGenerate || generationFailed ? (
        <Card variant={generationFailed ? "default" : "ai"} padding="lg" className="space-y-3">
          <SectionHeader
            title={generationFailed ? "Generation failed" : "Generate Campaign"}
                description={
              generationFailed
                ? "Campaign generation failed. Retry when ready. No draft is saved until Review finishes."
                : isVideoCampaign
                  ? "Interview is complete. Generate campaign copy first, then a short product showcase video."
                  : "Interview is complete. Generate a structured Meta campaign. No draft is saved until Review finishes."
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onGenerate} disabled={isBusy} className="gap-1.5">
              <Sparkles className="size-3.5" aria-hidden />
              {generateLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {readyForReview && generatedCampaign ? (
        <div ref={reviewRef} className="page-stack">
          {generatedCampaign.campaignType === "VIDEO" ? (
            <Card
              variant={videoPhase === "ready" ? "elevated" : "ai"}
              padding="lg"
              className="space-y-3"
            >
              <SectionHeader
                title={
                  videoPhase === "ready"
                    ? "Video ready"
                    : videoPhase === "generating"
                      ? "Generating video…"
                      : videoPhase === "error"
                        ? "Video generation failed"
                        : "Product video"
                }
                description={
                  videoPhase === "ready"
                    ? "Preview is ready for review. It will be attached as a CreativeAsset when you save the draft."
                    : videoPhase === "generating"
                      ? "Assembling a short product showcase from product images and campaign copy."
                      : videoPhase === "error"
                        ? videoError ?? "Unable to generate the product video."
                        : "Campaign copy is ready. Generate the product showcase video next."
                }
              />
              {videoPhase === "idle" || videoPhase === "error" ? (
                <Button
                  type="button"
                  onClick={() => void runVideoGeneration()}
                  disabled={isBusy}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  {videoPhase === "error" ? "Retry Video" : "Generate Video"}
                </Button>
              ) : null}
              {videoPhase === "generating" ? (
                <p className="text-body-sm text-muted-foreground">This usually takes under two minutes.</p>
              ) : null}
            </Card>
          ) : null}
          <CampaignReviewForm
            sessionId={session.id}
            campaignType={generatedCampaign.campaignType}
            payload={generatedCampaign.payload}
            model={generatedCampaign.model}
            draftCampaignIds={draftCampaignIds}
            generatedMedia={videoPreview}
            videoPhase={videoPhase}
            onRegenerate={onGenerate}
            isRegenerating={isBusy}
          />
        </div>
      ) : null}

      {readyForReview && !generatedCampaign ? (
        <Card padding="lg" className="space-y-3">
          <SectionHeader
            title="Campaign missing"
            description="This session is ready for review, but no generated campaign was found."
          />
          <Button type="button" onClick={onGenerate} disabled={isBusy}>
            {generateMutation.isPending ? "Generating Campaign…" : "Generate Campaign"}
          </Button>
        </Card>
      ) : null}

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="border-b border-border/50 px-5 py-4">
          <SectionHeader
            size="sm"
            title={interviewActive ? "Interview" : "Conversation"}
            description="Chat-style history for this campaign session."
          />
        </div>

        <div
          ref={threadRef}
          className="max-h-[28rem] space-y-3 overflow-y-auto bg-background/40 px-4 py-4 sm:px-5"
        >
          {(session.messages ?? []).length === 0 ? (
            <p className="py-8 text-center text-body-sm">No messages yet. Start the interview below.</p>
          ) : (
            (session.messages ?? []).map((message) => {
              const isUser = message.role === "USER";
              const isAssistant = message.role === "ASSISTANT";
              return (
                <div
                  key={message.id}
                  className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser ? (
                    <div
                      className={cn(
                        "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full",
                        isAssistant ? "bg-primary-muted text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Bot className="size-3.5" aria-hidden />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[min(100%,36rem)] rounded-[var(--radius-xl)] px-3.5 py-2.5 text-sm shadow-[var(--shadow-xs)]",
                      isUser && "bg-primary text-primary-foreground",
                      isAssistant && "bg-card text-foreground",
                      !isUser && !isAssistant && "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 flex items-center justify-between gap-3 text-[11px]",
                        isUser ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      <span>
                        {isAssistant ? "Assistant" : isUser ? "You" : "System"}
                        {message.stepKey ? ` · ${message.stepKey}` : ""}
                      </span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  {isUser ? (
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="size-3.5" aria-hidden />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/50 bg-card px-4 py-3 sm:px-5">
          {interviewActive ? (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (value.trim()) void onAdvance();
              }}
            >
              <label className="sr-only" htmlFor="interview-answer">
                Interview answer
              </label>
              <Input
                id="interview-answer"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Answer the current interview step…"
                className="flex-1"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={advanceMutation.isPending || !value.trim()}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" aria-hidden />
                  {advanceMutation.isPending ? "Saving…" : "Continue"}
                </Button>
                <Button type="button" variant="secondary" onClick={onResume} disabled={resumeMutation.isPending}>
                  Resume
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : closed ? (
            <p className="text-body-sm">This session is closed.</p>
          ) : readyForReview ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={cancelMutation.isPending}>
              Cancel session
            </Button>
          ) : (
            <p className="text-body-sm">Conversation is read-only in this phase.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export function AiSessionDetailsPage() {
  return <AiSessionStoreSyncGate />;
}

/**
 * Deep links / refresh must open the session even when no active store is selected yet.
 */
function AiSessionStoreSyncGate() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { activeStore, stores, isResolving, hasNoStores, setActiveStore } = useActiveStore();
  const sessionQuery = useAiSessionQuery(id);
  const sessionStoreId = sessionQuery.data?.shopifyStoreId;
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionStoreId || isResolving) {
      return;
    }
    if (activeStore?.id === sessionStoreId) {
      return;
    }
    const match = stores.find((store) => store.id === sessionStoreId);
    if (match) {
      setActiveStore(match.id);
    }
  }, [sessionStoreId, activeStore?.id, stores, isResolving, setActiveStore]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSyncTimedOut(false);
      }
    });

    if (!sessionStoreId || isResolving || sessionQuery.isLoading) {
      return () => {
        cancelled = true;
      };
    }
    if (activeStore?.id === sessionStoreId) {
      return () => {
        cancelled = true;
      };
    }
    if (!stores.some((store) => store.id === sessionStoreId)) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setSyncTimedOut(true);
      }
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionStoreId, isResolving, sessionQuery.isLoading, activeStore?.id, stores]);

  if (hasNoStores) {
    return (
      <PageEmpty
        title="No interviews available"
        description="This AI session needs a Shopify store in the current organization."
        action={
          <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
            <Button variant="secondary">Open Shopify</Button>
          </Link>
        }
      />
    );
  }

  if (isResolving || sessionQuery.isLoading) {
    return <PageLoading cards={2} />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <PageError
        title="Session not found"
        message={getErrorMessage(sessionQuery.error, "This AI session could not be loaded.")}
        onRetry={() => sessionQuery.refetch()}
      />
    );
  }

  if (!stores.some((store) => store.id === sessionStoreId)) {
    return (
      <PageEmpty
        title="Store unavailable"
        description="This session belongs to a store that is not available in the current organization."
      />
    );
  }

  if (!activeStore || activeStore.id !== sessionStoreId) {
    if (syncTimedOut) {
      return (
        <PageError
          title="Unable to open session"
          message="The session store could not be activated. Select the correct store from the header and try again."
          onRetry={() => {
            setSyncTimedOut(false);
            if (sessionStoreId) {
              setActiveStore(sessionStoreId);
            }
            void sessionQuery.refetch();
          }}
        />
      );
    }
    return <PageLoading cards={2} />;
  }

  return <AiSessionDetails />;
}
