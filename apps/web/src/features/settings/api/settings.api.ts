import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { UpdateUserProfilePayload, UserProfile } from "@/features/settings/types/settings.types";

export async function getUserProfile() {
  const response = await apiClient.get("/users/me");
  return unwrapEnvelope<UserProfile>(response.data);
}

export async function updateUserProfile(payload: UpdateUserProfilePayload) {
  const response = await apiClient.patch("/users/me", payload);
  return unwrapEnvelope<UserProfile>(response.data);
}
