"use client";

import { useMutation } from "@tanstack/react-query";
import { login, logout, register, switchOrganization } from "@/features/auth/api/auth.api";

export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: register });
}

export function useLogoutMutation() {
  return useMutation({ mutationFn: logout });
}

export function useSwitchOrganizationMutation() {
  return useMutation({ mutationFn: switchOrganization });
}
