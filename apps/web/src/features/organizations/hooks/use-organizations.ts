"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  getCurrentOrganization,
  getMemberships,
  getOrganizationMembers,
  removeMembership,
  removeOrganizationMember,
  switchActiveOrganization,
  updateCurrentOrganization,
  updateMembershipRole,
  updateOrganizationMemberRole,
} from "@/features/organizations/api/organizations.api";

export function useCurrentOrganizationQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.ORGANIZATIONS, "current"],
    queryFn: getCurrentOrganization,
  });
}

export function useUpdateCurrentOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCurrentOrganization,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
    },
  });
}

export function useOrganizationMembersQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.ORGANIZATIONS, "members"],
    queryFn: getOrganizationMembers,
  });
}

export function useUpdateOrganizationMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" }) =>
      updateOrganizationMemberRole(membershipId, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
    },
  });
}

export function useRemoveOrganizationMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeOrganizationMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
    },
  });
}

export function useMembershipsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.ORGANIZATIONS, "memberships"],
    queryFn: getMemberships,
  });
}

export function useUpdateMembershipRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" }) =>
      updateMembershipRole(membershipId, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
    },
  });
}

export function useRemoveMembershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeMembership,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
    },
  });
}

export function useCreateInvitationMutation() {
  return useMutation({
    mutationFn: ({ organizationId, email, role }: { organizationId: string; email: string; role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" }) =>
      createOrganizationInvitation(organizationId, { email, role }),
  });
}

export function useAcceptInvitationMutation() {
  return useMutation({
    mutationFn: acceptOrganizationInvitation,
  });
}

export function useSwitchOrganizationMutation() {
  return useMutation({
    mutationFn: switchActiveOrganization,
  });
}
