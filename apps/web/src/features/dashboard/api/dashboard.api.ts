import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { DashboardSummary } from "@/types/dashboard";

export async function getDashboardSummary() {
  const response = await apiClient.get("/dashboard");
  return unwrapEnvelope<DashboardSummary>(response.data);
}
