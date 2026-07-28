import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { GenerateAiCopyPayload, GenerateAiCopyResponse } from "@/features/ai-copy/types/ai-copy.types";

export async function generateAiCopy(payload: GenerateAiCopyPayload) {
  const response = await apiClient.post("/ai-copy/generate", payload);
  return unwrapEnvelope<GenerateAiCopyResponse>(response.data);
}
