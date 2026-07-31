import type { PaginatedResponse } from "@/types/api";
import { apiClient } from "@/lib/api/client";
import { API_GENERATE_TIMEOUT_MS, API_GENERATE_VIDEO_TIMEOUT_MS } from "@/lib/api/env";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  AdvanceAiSessionPayload,
  AiSession,
  AiSessionListQuery,
  AiSessionMessage,
  CreateAiSessionPayload,
  GenerateVideoPreviewResult,
  SaveAiSessionDraftPayload,
} from "@/features/ai-sessions/types/ai-session.types";

export async function createAiSession(payload: CreateAiSessionPayload) {
  const response = await apiClient.post("/ai-sessions", payload);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function listAiSessions(query: AiSessionListQuery = {}) {
  const response = await apiClient.get("/ai-sessions", { params: query });
  return unwrapEnvelope<PaginatedResponse<AiSession>>(response.data);
}

export async function getAiSession(id: string) {
  const response = await apiClient.get(`/ai-sessions/${id}`);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function resumeAiSession(id: string) {
  const response = await apiClient.post(`/ai-sessions/${id}/resume`);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function advanceAiSession(id: string, payload: AdvanceAiSessionPayload) {
  const response = await apiClient.post(`/ai-sessions/${id}/advance`, payload);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function cancelAiSession(id: string) {
  const response = await apiClient.post(`/ai-sessions/${id}/cancel`);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function generateAiSessionCampaign(id: string) {
  const response = await apiClient.post(`/ai-sessions/${id}/generate`, undefined, {
    timeout: API_GENERATE_TIMEOUT_MS,
  });
  return unwrapEnvelope<AiSession>(response.data);
}

export async function generateAiSessionVideo(id: string) {
  const response = await apiClient.post(`/ai-sessions/${id}/generate-video`, undefined, {
    timeout: API_GENERATE_VIDEO_TIMEOUT_MS,
  });
  return unwrapEnvelope<GenerateVideoPreviewResult>(response.data);
}

export async function saveAiSessionDraft(id: string, payload: SaveAiSessionDraftPayload) {
  const response = await apiClient.post(`/ai-sessions/${id}/save-draft`, payload);
  return unwrapEnvelope<AiSession>(response.data);
}

export async function listAiSessionMessages(id: string) {
  const response = await apiClient.get(`/ai-sessions/${id}/messages`);
  return unwrapEnvelope<AiSessionMessage[]>(response.data);
}
