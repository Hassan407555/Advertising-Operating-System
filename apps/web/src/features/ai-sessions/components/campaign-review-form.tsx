"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { useSaveAiSessionDraftMutation } from "@/features/ai-sessions/hooks/use-ai-sessions";
import { campaignReviewSchema } from "@/features/ai-sessions/schemas/campaign-review.schemas";
import type { DraftCampaignIds } from "@/features/ai-sessions/types/ai-session.types";
import { getErrorMessage } from "@/utils/errors";

type CampaignType = "IMAGE" | "CAROUSEL" | "VIDEO";

interface CampaignReviewFormProps {
  sessionId: string;
  campaignType: CampaignType;
  payload: Record<string, unknown>;
  model?: string;
  draftCampaignIds?: DraftCampaignIds;
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

  return {
    ...shared,
    hook: values.hook,
    videoScript: values.videoScript,
    storyboard: linesToArray(values.storyboardText),
    shotList: linesToArray(values.shotListText),
  };
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{open ? "Collapse" : "Expand"}</span>
      </button>
      {open ? <div className="space-y-3 border-t border-border pt-3">{children}</div> : null}
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const textareaClassName =
  "min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary";

export function CampaignReviewForm({
  sessionId,
  campaignType,
  payload,
  model,
  draftCampaignIds,
}: CampaignReviewFormProps) {
  const saveMutation = useSaveAiSessionDraftMutation(sessionId);
  const defaults = useMemo(
    () => buildDefaults(campaignType, payload),
    [campaignType, payload],
  );

  const form = useForm<ReviewFormState>({
    defaultValues: defaults,
  });

  const [openGeneral, setOpenGeneral] = useState(true);
  const [openCreative, setOpenCreative] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const hadDraft = Boolean(draftCampaignIds);

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
      await saveMutation.mutateAsync({ payload: parsed.data });
      form.reset(values);
      toast.success(hadDraft ? "Draft campaign updated." : "Draft campaign saved.");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to save draft.");
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Review campaign</h2>
            <p className="text-sm text-muted-foreground">
              Edit any field, then save as a draft. Nothing is published to Meta.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
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
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">Draft saved</p>
            <p className="text-muted-foreground">
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
          <p className="text-xs text-amber-600">You have unsaved changes.</p>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm text-red-400">
            {formError}
          </p>
        ) : null}
      </Card>

      <Section
        title="General"
        open={openGeneral}
        onToggle={() => setOpenGeneral((value) => !value)}
      >
        <Field label="Campaign name">
          <Input {...form.register("campaignName")} />
        </Field>
        <Field label="Campaign type">
          <Input value={campaignType} disabled readOnly />
        </Field>
        <Field label="Objective">
          <Input {...form.register("objective")} />
        </Field>
        <Field label="Audience">
          <textarea className={textareaClassName} {...form.register("audience")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Daily budget">
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("dailyBudget", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Currency">
            <Input {...form.register("currency")} placeholder="USD" />
          </Field>
        </div>
        <Field label="CTA">
          <Input {...form.register("cta")} placeholder="SHOP_NOW" />
        </Field>
      </Section>

      {campaignType === "IMAGE" ? (
        <Section
          title="Image ad"
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
        >
          <Field label="Headlines (one per line)">
            <textarea className={textareaClassName} {...form.register("headlinesText")} />
          </Field>
          <Field label="Primary text">
            <textarea className={textareaClassName} {...form.register("primaryText")} />
          </Field>
          <Field label="Description">
            <textarea className={textareaClassName} {...form.register("description")} />
          </Field>
          <Field label="Creative brief">
            <textarea className={textareaClassName} {...form.register("creativeBrief")} />
          </Field>
        </Section>
      ) : null}

      {campaignType === "CAROUSEL" ? (
        <Section
          title="Carousel ad"
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
        >
          <Field label="Card titles (one per line)">
            <textarea className={textareaClassName} {...form.register("cardTitlesText")} />
          </Field>
          <Field label="Card descriptions (one per line)">
            <textarea
              className={textareaClassName}
              {...form.register("cardDescriptionsText")}
            />
          </Field>
          <Field label="Card order (comma-separated)">
            <Input {...form.register("cardOrderText")} />
          </Field>
          <Field label="Creative strategy">
            <textarea className={textareaClassName} {...form.register("creativeStrategy")} />
          </Field>
        </Section>
      ) : null}

      {campaignType === "VIDEO" ? (
        <Section
          title="Video ad"
          open={openCreative}
          onToggle={() => setOpenCreative((value) => !value)}
        >
          <Field label="Hook">
            <Input {...form.register("hook")} />
          </Field>
          <Field label="Video script">
            <textarea className={textareaClassName} {...form.register("videoScript")} />
          </Field>
          <Field label="Storyboard (one shot per line)">
            <textarea className={textareaClassName} {...form.register("storyboardText")} />
          </Field>
          <Field label="Shot list (one per line)">
            <textarea className={textareaClassName} {...form.register("shotListText")} />
          </Field>
        </Section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? "Saving…"
            : hadDraft
              ? "Update Draft"
              : "Save Draft"}
        </Button>
      </div>
    </form>
  );
}
