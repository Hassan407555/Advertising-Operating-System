import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  AcceptInvitationPayload,
  CreateInvitationPayload,
  CreateInvitationResponse,
  CurrentOrganizationResponse,
  Membership,
  OrganizationMember,
  SwitchOrganizationResponse,
  UpdateMembershipRolePayload,
  UpdateOrganizationPayload,
} from "@/features/organizations/types/organization.types";

export async function getCurrentOrganization() {
  const response = await apiClient.get("/organizations/current");
  return unwrapEnvelope<CurrentOrganizationResponse>(response.data);
}

export async function updateCurrentOrganization(payload: UpdateOrganizationPayload) {
  const response = await apiClient.patch("/organizations/current", payload);
  return unwrapEnvelope<CurrentOrganizationResponse>(response.data);
}

export async function getOrganizationMembers() {
  const response = await apiClient.get("/organizations/members");
  return unwrapEnvelope<OrganizationMember[]>(response.data);
}

export async function updateOrganizationMemberRole(membershipId: string, payload: UpdateMembershipRolePayload) {
  const response = await apiClient.patch(`/organizations/members/${membershipId}/role`, payload);
  return unwrapEnvelope<OrganizationMember>(response.data);
}

export async function removeOrganizationMember(membershipId: string) {
  await apiClient.delete(`/organizations/members/${membershipId}`);
}

export async function getMemberships() {
  const response = await apiClient.get("/memberships");
  return unwrapEnvelope<Membership[]>(response.data);
}

export async function updateMembershipRole(membershipId: string, payload: UpdateMembershipRolePayload) {
  const response = await apiClient.patch(`/memberships/${membershipId}/role`, payload);
  return unwrapEnvelope<Membership>(response.data);
}

export async function removeMembership(membershipId: string) {
  const response = await apiClient.delete(`/memberships/${membershipId}`);
  return unwrapEnvelope<{ message: string }>(response.data);
}

export async function createOrganizationInvitation(organizationId: string, payload: CreateInvitationPayload) {
  const response = await apiClient.post(`/organizations/${organizationId}/invitations`, payload);
  return unwrapEnvelope<CreateInvitationResponse>(response.data);
}

export async function acceptOrganizationInvitation(payload: AcceptInvitationPayload) {
  const response = await apiClient.post("/invitations/accept", payload);
  return unwrapEnvelope<CreateInvitationResponse["invitation"]>(response.data);
}

export async function switchActiveOrganization(organizationId: string) {
  const response = await apiClient.post("/auth/switch-organization", { organizationId });
  return unwrapEnvelope<SwitchOrganizationResponse>(response.data);
}
