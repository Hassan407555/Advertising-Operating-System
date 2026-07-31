import {
  advanceAiSession,
  generateAiSessionCampaign,
  getAiSession,
  saveAiSessionDraft,
} from "@/features/ai-sessions/api/ai-sessions.api";
import type { AiSession } from "@/features/ai-sessions/types/ai-session.types";
import { AppError } from "@/lib/api/errors";
import { startAdvertisingEntry } from "@/features/products/api/products.api";
import type { GenerateCampaignProgressStep } from "@/features/products/types/product.types";

const INTERVIEW_DEFAULTS: Record<string, string> = {
  country: "United States",
  language: "English",
  dailyBudget: "50",
  objective: "CONVERSIONS",
  adType: "IMAGE",
  carouselCardCount: "3",
  carouselHighlightProducts: "yes",
  videoDuration: "30s",
  videoStyle: "UGC",
  videoTone: "Friendly",
};

const INTERVIEW_STATUSES = new Set([
  "CREATED",
  "AWAITING_INPUT",
  "INTERVIEWING",
]);

const GENERATE_READY_STATUSES = new Set([
  "READY_FOR_ANALYSIS",
  "REVIEWING",
  "FAILED",
]);

export type GenerateCampaignFromProductResult =
  | { outcome: "campaign"; session: AiSession; campaignId: string }
  | { outcome: "session"; session: AiSession; reason?: string };

export interface GenerateCampaignFromProductOptions {
  storeId: string;
  productId: string;
  /** When false, skip save-draft and return the reviewing session (e.g. MEMBER role). */
  canSaveDraft?: boolean;
  onStep?: (step: GenerateCampaignProgressStep) => void;
}

function currentInterviewStepKey(session: AiSession): string | null {
  const planned = Array.isArray(session.workflowContext.plannedSteps)
    ? session.workflowContext.plannedSteps.map(String)
    : [];
  const index =
    typeof session.workflowContext.stepIndex === "number"
      ? session.workflowContext.stepIndex
      : 0;
  return planned[index] ?? null;
}

function draftCampaignId(session: AiSession): string | null {
  return session.workflowContext.draftCampaignIds?.campaignId ?? null;
}

function generatedPayload(session: AiSession): Record<string, unknown> | null {
  const generated = session.workflowContext.generatedCampaign;
  if (!generated?.payload || typeof generated.payload !== "object") {
    return null;
  }
  return generated.payload as Record<string, unknown>;
}

async function completeInterview(session: AiSession): Promise<AiSession> {
  let current = session;
  let guard = 0;

  while (INTERVIEW_STATUSES.has(current.status) && guard < 20) {
    guard += 1;
    const stepKey = currentInterviewStepKey(current);
    const value =
      (stepKey ? INTERVIEW_DEFAULTS[stepKey] : undefined) ??
      INTERVIEW_DEFAULTS.country;
    current = await advanceAiSession(current.id, { value });
  }

  if (INTERVIEW_STATUSES.has(current.status)) {
    throw new Error("Unable to complete the campaign interview automatically.");
  }

  return current;
}

/**
 * Product → AI session → generate → save draft → campaign id.
 * Uses advertising-entry (not direct POST /ai-sessions).
 */
export async function generateCampaignFromProduct(
  options: GenerateCampaignFromProductOptions,
): Promise<GenerateCampaignFromProductResult> {
  const { storeId, productId, canSaveDraft = true, onStep } = options;

  onStep?.("creating_session");
  let session = await startAdvertisingEntry(storeId, { productId });

  const existingDraftId = draftCampaignId(session);
  if (existingDraftId) {
    onStep?.("redirecting");
    return { outcome: "campaign", session, campaignId: existingDraftId };
  }

  if (INTERVIEW_STATUSES.has(session.status)) {
    onStep?.("completing_interview");
    session = await completeInterview(session);
  }

  if (
    GENERATE_READY_STATUSES.has(session.status) &&
    !generatedPayload(session)
  ) {
    onStep?.("generating");
    session = await generateAiSessionCampaign(session.id);
  }

  if (!generatedPayload(session)) {
    session = await getAiSession(session.id);
  }

  const payload = generatedPayload(session);
  if (!payload) {
    throw new Error("Campaign generation finished without a reviewable payload.");
  }

  const alreadyDrafted = draftCampaignId(session);
  if (alreadyDrafted) {
    onStep?.("redirecting");
    return { outcome: "campaign", session, campaignId: alreadyDrafted };
  }

  if (!canSaveDraft) {
    onStep?.("redirecting");
    return {
      outcome: "session",
      session,
      reason: "Campaign generated. Review and save the draft to continue.",
    };
  }

  if (session.status !== "REVIEWING") {
    throw new Error(
      `Cannot save draft while session is ${session.status}. Expected REVIEWING.`,
    );
  }

  onStep?.("saving_draft");
  try {
    session = await saveAiSessionDraft(session.id, { payload });
  } catch (error) {
    if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 401)) {
      onStep?.("redirecting");
      return {
        outcome: "session",
        session,
        reason: "Campaign generated. Your role can review but not save drafts.",
      };
    }
    throw error;
  }

  const campaignId = draftCampaignId(session);
  if (!campaignId) {
    throw new Error("Draft save succeeded but no campaign id was returned.");
  }

  onStep?.("redirecting");
  return { outcome: "campaign", session, campaignId };
}

export function progressPercent(step: GenerateCampaignProgressStep): number {
  switch (step) {
    case "idle":
      return 0;
    case "creating_session":
      return 15;
    case "completing_interview":
      return 35;
    case "generating":
      return 60;
    case "saving_draft":
      return 85;
    case "redirecting":
      return 100;
    default:
      return 0;
  }
}

export function progressLabel(step: GenerateCampaignProgressStep): string {
  switch (step) {
    case "creating_session":
      return "Creating AI session…";
    case "completing_interview":
      return "Preparing campaign inputs…";
    case "generating":
      return "Generating campaign…";
    case "saving_draft":
      return "Saving draft…";
    case "redirecting":
      return "Opening campaign…";
    default:
      return "Working…";
  }
}
