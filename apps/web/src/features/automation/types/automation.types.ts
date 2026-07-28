import type { PaginatedResponse } from "@/types/api";

export type AutomationWorkflowType = "campaign" | "publish" | "full";
export type AutomationRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AutomationStepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
export type AutomationTriggerType = "MANUAL_LAUNCH" | "SCHEDULED" | "EVENT";
export type AutomationActionType =
  | "GENERATE_CAMPAIGN"
  | "GENERATE_AI_COPY"
  | "PUBLISH_CAMPAIGN"
  | "SYNCHRONIZE_CAMPAIGN";

export interface AutomationStep {
  id: string;
  organizationId: string;
  runId: string;
  actionType: AutomationActionType;
  stepOrder: number;
  status: AutomationStepStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  organizationId: string;
  pipelineId: string;
  triggerType: AutomationTriggerType;
  status: AutomationRunStatus;
  triggeredByUserId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRunsQuery {
  page?: number;
  limit?: number;
  pipelineId?: string;
  status?: AutomationRunStatus;
  triggerType?: AutomationTriggerType;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type AutomationRunsResponse = PaginatedResponse<AutomationRun>;

export interface RunCampaignWorkflowPayload {
  productId: string;
  countries: string[];
  platforms: string[];
  dailyBudget: number;
  language: string;
  marketingGoal: string;
  adAccountIds: Record<string, string>;
  currency?: string;
}

export interface RunPublishWorkflowPayload {
  campaignId?: string;
  campaignIds?: string[];
  platform?: string;
  adAccountId?: string;
  adAccountIds?: Record<string, string>;
}

export interface RunFullWorkflowPayload extends RunCampaignWorkflowPayload {
  options?: Record<string, unknown>;
}
