import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { AuthLoginResponse, CurrentUserResponse } from "@/types/auth";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export async function login(payload: LoginRequest) {
  const response = await apiClient.post("/auth/login", payload);
  return unwrapEnvelope<AuthLoginResponse>(response.data);
}

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post("/auth/register", payload);
  return unwrapEnvelope<AuthLoginResponse>(response.data);
}

export async function getCurrentUser() {
  const response = await apiClient.get("/auth/me");
  return unwrapEnvelope<CurrentUserResponse>(response.data);
}

export async function switchOrganization(organizationId: string) {
  const response = await apiClient.post("/auth/switch-organization", { organizationId });
  return unwrapEnvelope<AuthLoginResponse>(response.data);
}

export async function logout() {
  const response = await apiClient.post("/auth/logout");
  return unwrapEnvelope<Record<string, never>>(response.data);
}
