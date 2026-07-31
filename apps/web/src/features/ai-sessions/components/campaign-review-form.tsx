"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ChevronDown,
  FileText,
  ImageIcon,
  Layers,
  RefreshCw,
  Save,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { useSaveAiSessionDraftMutation } from "@/features/ai-sessions/hooks/use-ai-sessions";
import { campaignReviewSchema } from "@/features/ai-sessions/schemas/campaign-review.schemas";
import type {
  DraftCampaignIds,
  GeneratedVideoPreview,
} from "@/features/ai-sessions/types/ai-session.types";
import { API_BASE_URL } from "@/lib/api/env";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";

type CampaignType = "IMAGE" | "CAROUSEL" | "VIDEO" | "NONE";
type VideoGenerationPhase = "idle" | "generating" | "ready" | "error";

interface CampaignReviewFormProps {
  sessionId: string;
  campaignType: CampaignType;
  payload: Record<string, unknown>;
  model?: string;
  draftCampaignIds?: DraftCampaignIds;
  generatedMedia?: GeneratedVideoPreview | null;
  videoPhase?: VideoGenerationPhase;
  onRegenerate?: () => void | Promise<void>;
  isRegenerating?: boolean;
}

/** Flat editable shape used by the review form (validated on submit). */
interface ReviewFormState {
  campaignName: string;
  objective: string;
  audience: string;
  dailyBudget: number;
  currency: string;
  cta: string;
  headlinesText: string;
  primaryText: string;
  description: string;
  creativeBrief: string;
  cardTitlesText: string;
  cardDescriptionsText: string;
  cardOrderText: string;
  creativeStrategy: string;
  hook: string;
  videoScript: string;
  storyboardText: string;
  shotListText: string;
  creativeNotes: string;
  existingCreativeId: string;
  existingPostId: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item ?? ""));
}

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(value: string[]): string {
  return value.join("\n");
}

function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${apiOrigin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function buildDefaults(
  campaignType: CampaignType,
  payload: Record<string, unknown>,
): ReviewFormState {
  const budgetRaw =
    payload.budget && typeof payload.budget === "object"
      ? (payload.budget as Record<string, unknown>)
      : {};

  const headlines =
    asStringArray(payload.headlines).length > 0
      ? asStringArray(payload.headlines)
      : [String(payload.headline ?? "")].filter(Boolean);

  const cardTitles = asStringArray(payload.cardTitles);
  const cardOrder = Array.isArray(payload.cardOrder)
    ? payload.cardOrder.map(String)
    : cardTitles.map((_, index) => String(index + 1));

  return {
    campaignName: String(payload.campaignName ?? ""),
    objective: String(payload.objective ?? ""),
    audience: String(payload.audience ?? ""),
    dailyBudget: Number(budgetRaw.dailyBudget ?? 0),
    currency: typeof budgetRaw.currency === "string" ? budgetRaw.currency : "",
    cta: String(payload.cta ?? payload.CTA ?? ""),
    headlinesText: arrayToLines(headlines),
    primaryText: String(payload.primaryText ?? ""),
    description: String(payload.description ?? ""),
    creativeBrief: String(payload.creativeBrief ?? ""),
    cardTitlesText: arrayToLines(cardTitles),
    cardDescriptionsText: arrayToLines(asStringArray(payload.cardDescriptions)),
    cardOrderText: cardOrder.join(", "),
    creativeStrategy: String(
      payload.creativeStrategy ?? payload.carouselStrategy ?? "",
    ),
    hook: String(payload.hook ?? ""),
    videoScript: String(payload.videoScript ?? ""),
    storyboardText: arrayToLines(asStringArray(payload.storyboard)),
    shotListText: arrayToLines(asStringArray(payload.shotList)),
    creativeNotes: String(payload.creativeNotes ?? ""),
    existingCreativeId: String(payload.existingCreativeId ?? ""),
    existingPostId: String(payload.existingPostId ?? ""),
  };
}

function toPayload(
  campaignType: CampaignType,
  values: ReviewFormState,
): Record<string, unknown> {
  const shared = {
    campaignType,
    campaignName: values.campaignName,
    objective: values.objective,
    audience: values.audience,
    budget: {
      dailyBudget: values.dailyBudget,
      ...(values.currency.trim() ? { currency: values.currency.trim() } : {}),
    },
    cta: values.cta,
  };

  if (campaignType === "IMAGE") {
    return {
      ...shared,
      headlines: linesToArray(values.headlinesText),
      primaryText: values.primaryText,
      description: values.description,
      creativeBrief: values.creativeBrief,
    };
  }

  if (campaignType === "CAROUSEL") {
    const cardTitles = linesToArray(values.cardTitlesText);
    const orderFromText = values.cardOrderText
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((num) => Number.isFinite(num));
    return {
      ...shared,
      cardTitles,
      cardDescriptions: linesToArray(values.cardDescriptionsText),
      cardOrder:
        orderFromText.length > 0
          ? orderFromText
          : cardTitles.map((_, index) => index + 1),
      creativeStrategy: values.creativeStrategy,
    };
  }

  if (campaignType === "NONE") {
    return {
      ...shared,
      requiresCreative: false,
      ...(values.creativeNotes.trim()
        ? { creativeNotes: values.creativeNotes.trim() }
        : {}),
      ...(values.existingCreativeId.trim()
        ? { existingCreativeId: values.existingCreativeId.trim() }
        : {}),
      ...(values.existingPostId.trim()
        ? { existingPostId: values.existingPostId.trim() }
        : {}),
      ...(values.headlinesText.trim()
        ? { headline: linesToArray(values.headlinesText)[0] }
        : {}),
      ...(values.primaryText.trim()
        ? { primaryText: values.primaryText.trim() }
        : {}),
    };
  }

  return {
    ...shared,
    hook: values.hook,
    videoScript: values.videoScript,
    storyboard: linesToArray(values.storyboardText),
    shotList: linesToArray(values.shotListText),
  };
}

function ReviewSection({
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  titleId,
  children,
}: {
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  open: boolean;
  onToggle: () => void;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      className="space-y-4"
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/60 text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <SectionHeader size="sm" title={title} description={description} titleId={titleId} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${titleId}-panel`}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
      </div>
      {open ? (
        <div id={`${titleId}-panel`} className="section-stack border-t border-border/50 pt-4">
          {children}
        </div>
      ) : null}
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function creativeMeta(campaignType: CampaignType) {
  if (campaignType === "IMAGE") {
    return {
      title: "Creative",
      description: "Headlines, body copy, and creative brief for the image ad.",
      icon: ImageIcon,
    };
  }
  if (campaignType === "CAROUSEL") {
    return {
      title: "Creative",
      description: "Card copy, order, and carousel strategy.",
      icon: Layers,
    };
  }
  if (campaignType === "NONE") {
    return {
      title: "Creative (deferred)",
      description:
        "No uploaded media required. Attach an existing creative/post later, or keep as a placeholder.",
      icon: FileText,
    };
  }
  return {
    title: "Creative",
    description: "Generated product video, hook, script, and planning notes.",
    icon: Video,
  };
}

export function CampaignReviewForm({
  sessionId,
  campaignType,
  payload,
  model,
  draftCampaignIds,
  generatedMedia,
  videoPhase = "idle",
  onRegenerate,
  isRegenerating = false,
}: CampaignReviewFormProps) {
  const router = useRouter();
  const saveMutation = useSaveAiSessionDraftMutation(sessionId);
  const defaults = useMemo(
    () => buildDefaults(campaignType, payload),
    [campaignType, payload],
  );

  const form = useForm<ReviewFormState>({
    defaultValues: defaults,
  });

  const [openOverview, setOpenOverview] = useState(true);
  const [openAudience, setOpenAudience] = useState(true);
  const [openBudget, setOpenBudget] = useState(true);
  const [openCreative, setOpenCreative] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const hadDraft = Boolean(draftCampaignIds);
  const creative = creativeMeta(campaignType);

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const candidate = toPayload(campaignType, values);
    const parsed = campaignReviewSchema.safeParse(candidate);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Validation failed";
      setFormError(message);
      toast.error(message);
      return;
    }

    try {
      const updated = await saveMutation.mutateAsync({
        payload: parsed.data,
        ...(campaignType === "VIDEO" && generatedMedia
          ? { generatedVideo: generatedMedia }
          : {}),
      });
      form.reset(values);
      const campaignId = updated.workflowContext.draftCampaignIds?.campaignId;
      toast.success(hadDraft ? "Draft campaign updated." : "Draft campaign saved.");
      if (campaignId) {
        router.push(ROUTES.CAMPAIGN_DETAILS(campaignId));
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to save draft.");
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <Card variant="elevated" padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary-muted text-primary">
              <FileText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-heading">Review campaign</h2>
              <p className="text-body-sm">
                Edit any field, then save as a draft. You will continue to Campaign Details to publish.
              </p>
            </div>
          </div>
          <div className="text-right text-caption">
            <p>
              Type: <span className="font-medium text-foreground">{campaignType}</span>
            </p>
            {model ? (
              <p>
                Model: <span className="font-medium text-foreground">{model}</span>
              </p>
            ) : null}
          </div>
        </div>

        {draftCampaignIds ? (
          <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <p className="font-medium">Draft saved</p>
            <p className="text-body-sm">
              Campaign{" "}
              <Link
                href={ROUTES.CAMPAIGN_DETAILS(draftCampaignIds.campaignId)}
                className="underline-offset-4 hover:underline"
              >
                {draftCampaignIds.campaignId}
              </Link>
              . Saving again updates the same draft entities.
            </p>
          </div>
        ) : null}

        {form.formState.isDirty ? (
          <p className="text-caption text-amber-600">You have unsaved changes.</p>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
      </Card>

      <ReviewSection
        title="Overview"
        description="Campaign identity, objective, and call to action."
        icon={FileText}
        open={openOverview}
        onToggle={() => setOpenOverview((value) => !value)}
        titleId="review-overview"
      >
        <Field label="Campaign name" htmlFor="review-campaign-name">
          <Input id="review-campaign-name" {...form.register("campaignName")} />
        </Field>
        <Field label="Campaign type" htmlFor="review-campaign-type">
          <Input id="review-campaign-type" value={campaignType} disabled readOnly />
        </Field>
        <Field label="Objective" htmlFor="review-objective">
          <Input id="review-objective" {...form.register("objective")} />
        </Field>
        <Field label="CTA" htmlFor="review-cta">
          <Input id="review-cta" {...form.register("cta")} placeholder="SHOP_NOW" />
        </Field>
      </ReviewSection>

      <ReviewSection
        title="Audience"
        description="Who this campaign should reach."
        icon={Users}
        open={openAudience}
        onToggle={() => setOpenAudience((value) => !value)}
        titleId="review-audience-section"
      >
        <Field label="Audience" htmlFor="review-audience">
          <Textarea id="review-audience" {...form.register("audience")} />
        </Field>
      </ReviewSection>

      <ReviewSection
        title="Budget"
        description="Daily spend and currency for the draft campaign."
        icon={Wallet}
        open={openBudget}
        onToggle={() => setOpenBudget((value) => !value)}
        titleId="review-budget"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Daily budget" htmlFor="review-daily-budget">
            <Input
              id="review-daily-budget"
              type="number"
              step="0.01"
              min="0"
              {...form.register("dailyBudget", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Currency" htmlFor="review-currency">
            <Input id="review-currency" {...form.register("currency")} placeholder="USD" />
          </Field>
        </div>
      </ReviewSection>

      {campaignType === "IMAGE" ? (
        <ReviewSection
          title={creative.title}
          description={creative.description}
          icon={creative.icon}
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
          titleId="review-creative"
        >
          <Field label="Headlines (one per line)" htmlFor="review-headlines">
            <Textarea id="review-headlines" {...form.register("headlinesText")} />
          </Field>
          <Field label="Primary text" htmlFor="review-primary-text">
            <Textarea id="review-primary-text" {...form.register("primaryText")} />
          </Field>
          <Field label="Description" htmlFor="review-description">
            <Textarea id="review-description" {...form.register("description")} />
          </Field>
          <Field label="Creative brief" htmlFor="review-creative-brief">
            <Textarea id="review-creative-brief" {...form.register("creativeBrief")} />
          </Field>
        </ReviewSection>
      ) : null}

      {campaignType === "CAROUSEL" ? (
        <ReviewSection
          title={creative.title}
          description={creative.description}
          icon={creative.icon}
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
          titleId="review-creative"
        >
          <Field label="Card titles (one per line)" htmlFor="review-card-titles">
            <Textarea id="review-card-titles" {...form.register("cardTitlesText")} />
          </Field>
          <Field label="Card descriptions (one per line)" htmlFor="review-card-descriptions">
            <Textarea
              id="review-card-descriptions"
              {...form.register("cardDescriptionsText")}
            />
          </Field>
          <Field label="Card order (comma-separated)" htmlFor="review-card-order">
            <Input id="review-card-order" {...form.register("cardOrderText")} />
          </Field>
          <Field label="Creative strategy" htmlFor="review-creative-strategy">
            <Textarea
              id="review-creative-strategy"
              {...form.register("creativeStrategy")}
            />
          </Field>
        </ReviewSection>
      ) : null}

      {campaignType === "VIDEO" ? (
        <ReviewSection
          title={creative.title}
          description={creative.description}
          icon={creative.icon}
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
          titleId="review-creative"
        >
          {generatedMedia?.url && videoPhase === "ready" ? (
            <div className="space-y-2">
              <Label>Generated product video</Label>
              <video
                className="aspect-square w-full max-w-md rounded-[var(--radius-md)] bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                src={resolveMediaUrl(generatedMedia.url)}
              >
                Your browser does not support video playback.
              </video>
              {typeof generatedMedia.durationSeconds === "number" ? (
                <p className="text-body-sm text-muted-foreground">
                  ~{generatedMedia.durationSeconds}s product showcase
                </p>
              ) : null}
            </div>
          ) : videoPhase === "generating" ? (
            <p className="text-body-sm text-muted-foreground">
              Generating video… preview will appear here when ready.
            </p>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No generated video yet. Generate the video above before saving a VIDEO draft.
            </p>
          )}
          <Field label="Hook" htmlFor="review-hook">
            <Input id="review-hook" {...form.register("hook")} />
          </Field>
          <Field label="Video script" htmlFor="review-video-script">
            <Textarea id="review-video-script" {...form.register("videoScript")} />
          </Field>
          <Field label="Storyboard (one shot per line)" htmlFor="review-storyboard">
            <Textarea id="review-storyboard" {...form.register("storyboardText")} />
          </Field>
          <Field label="Shot list (one per line)" htmlFor="review-shot-list">
            <Textarea id="review-shot-list" {...form.register("shotListText")} />
          </Field>
        </ReviewSection>
      ) : null}

      {campaignType === "NONE" ? (
        <ReviewSection
          title={creative.title}
          description={creative.description}
          icon={creative.icon}
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
          titleId="review-creative"
        >
          <p className="text-body-sm text-muted-foreground">
            requiresCreative = false. Media upload is not required for this campaign type.
          </p>
          <Field label="Creative notes" htmlFor="review-creative-notes">
            <Textarea id="review-creative-notes" {...form.register("creativeNotes")} />
          </Field>
          <Field label="Existing Meta creative ID (optional)" htmlFor="review-existing-creative">
            <Input
              id="review-existing-creative"
              {...form.register("existingCreativeId")}
              placeholder="creative_id"
            />
          </Field>
          <Field label="Existing page post ID (optional)" htmlFor="review-existing-post">
            <Input
              id="review-existing-post"
              {...form.register("existingPostId")}
              placeholder="object_story_id"
            />
          </Field>
          <Field label="Optional draft headline" htmlFor="review-none-headline">
            <Input id="review-none-headline" {...form.register("headlinesText")} />
          </Field>
          <Field label="Optional draft primary text" htmlFor="review-none-primary">
            <Textarea id="review-none-primary" {...form.register("primaryText")} />
          </Field>
        </ReviewSection>
      ) : null}

      <div className="inline-cluster">
        <Button
          type="submit"
          disabled={
            saveMutation.isPending ||
            isRegenerating ||
            (campaignType === "VIDEO" && videoPhase !== "ready")
          }
        >
          <Save className="size-3.5" aria-hidden />
          {saveMutation.isPending
            ? "Saving…"
            : hadDraft
              ? "Update Draft & Continue"
              : "Save Draft & Continue"}
        </Button>
        {onRegenerate ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRegenerate()}
            disabled={isRegenerating || saveMutation.isPending}
          >
            <RefreshCw
              className={cn("size-3.5", isRegenerating && "animate-spin")}
              aria-hidden
            />
            {isRegenerating
              ? generateMutationLabel(campaignType)
              : "Regenerate Campaign"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function generateMutationLabel(campaignType: CampaignType) {
  return campaignType === "VIDEO" ? "Regenerating…" : "Generating…";
}
