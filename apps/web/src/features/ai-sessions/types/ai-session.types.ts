export type AiSessionStatus =
  | "CREATED"
  | "AWAITING_INPUT"
  | "INTERVIEWING"
  | "READY_FOR_ANALYSIS"
  | "ANALYZING"
  | "PLANNING"
  | "BUILDING"
  | "REVIEWING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "FAILED"
  | "CANCELLED"
  | "ARCHIVED";

export type AiSessionSource = "PRODUCT_PAGE";

export type AiSessionMessageRole = "SYSTEM" | "ASSISTANT" | "USER";

export interface AiSessionMessage {
  id: string;
  role: AiSessionMessageRole;
  content: string;
  stepKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiSession {
  id: string;
  organizationId: string;
  shopifyStoreId: string;
  productId: string;
  createdByUserId: string;
  sessionSource: AiSessionSource;
  status: AiSessionStatus;
  currentManager: string;
  currentPhase: string;
  workflowMetadata: Record<string, unknown>;
  workflowContext: {
    stepIndex?: number;
    answers?: Record<string, string>;
    plannedSteps?: string[];
    generatedCampaign?: {
      campaignType: "IMAGE" | "CAROUSEL" | "VIDEO";
      payload: Record<string, unknown>;
      generatedAt: string;
      model: string;
      provider: string;
    };
    draftCampaignIds?: DraftCampaignIds;
    [key: string]: unknown;
  };
  workflowVersion: string;
  promptVersions: Record<string, string>;
  errorMessage: string | null;
  lastActivityAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiSessionMessage[];
  reusedExisting?: boolean;
}

export interface DraftCampaignIds {
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
}

export interface SaveAiSessionDraftPayload {
  payload: Record<string, unknown>;
}

export interface CreateAiSessionPayload {
  storeId: string;
  productId: string;
  sessionSource?: AiSessionSource;
}

export interface AdvanceAiSessionPayload {
  value?: string;
}

export interface AiSessionListQuery {
  page?: number;
  limit?: number;
  storeId?: string;
  productId?: string;
  status?: AiSessionStatus;
}
