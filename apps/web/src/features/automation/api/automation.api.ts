import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  AutomationRun,
  AutomationRunsQuery,
  AutomationRunsResponse,
  RunCampaignWorkflowPayload,
  RunFullWorkflowPayload,
  RunPublishWorkflowPayload,
} from "@/features/automation/types/automation.types";

export async function runCampaignWorkflow(payload: RunCampaignWorkflowPayload) {
  const response = await apiClient.post("/automation/workflows/campaign", payload);
  return unwrapEnvelope<AutomationRun>(response.data);
}

export async function runPublishWorkflow(payload: RunPublishWorkflowPayload) {
  const response = await apiClient.post("/automation/workflows/publish", payload);
  return unwrapEnvelope<AutomationRun>(response.data);
}

export async function runFullWorkflow(payload: RunFullWorkflowPayload) {
  const response = await apiClient.post("/automation/workflows/full", payload);
  return unwrapEnvelope<AutomationRun>(response.data);
}

export async function getWorkflowStatus(runId: string) {
  const response = await apiClient.get(`/automation/workflows/${runId}`);
  return unwrapEnvelope<AutomationRun>(response.data);
}

export async function getAutomationRuns(query: AutomationRunsQuery) {
  const response = await apiClient.get("/automation/runs", { params: query });
  return unwrapEnvelope<AutomationRunsResponse>(response.data);
}

export async function getAutomationRunById(runId: string) {
  const response = await apiClient.get(`/automation/runs/${runId}`);
  return unwrapEnvelope<AutomationRun>(response.data);
}
