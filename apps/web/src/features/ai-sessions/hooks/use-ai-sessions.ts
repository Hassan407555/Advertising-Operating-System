"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  advanceAiSession,
  cancelAiSession,
  createAiSession,
  generateAiSessionCampaign,
  getAiSession,
  listAiSessions,
  resumeAiSession,
  saveAiSessionDraft,
} from "@/features/ai-sessions/api/ai-sessions.api";
import type {
  AdvanceAiSessionPayload,
  AiSessionListQuery,
  CreateAiSessionPayload,
  SaveAiSessionDraftPayload,
} from "@/features/ai-sessions/types/ai-session.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

export function useAiSessionsQuery(query: AiSessionListQuery = {}) {
  const { activeStore } = useActiveStore();
  const storeId = query.storeId ?? activeStore?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.AI_SESSIONS, storeId ?? "none", query],
    enabled: Boolean(storeId),
    queryFn: () => listAiSessions({ ...query, storeId }),
  });
}

export function useAiSessionQuery(id?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AI_SESSIONS, "detail", id ?? "none"],
    enabled: Boolean(id),
    queryFn: () => getAiSession(id!),
  });
}

export function useCreateAiSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAiSessionPayload) => createAiSession(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useAdvanceAiSessionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdvanceAiSessionPayload) => advanceAiSession(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useResumeAiSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeAiSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useCancelAiSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelAiSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useGenerateAiSessionCampaignMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateAiSessionCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useSaveAiSessionDraftMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveAiSessionDraftPayload) => saveAiSessionDraft(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS });
    },
  });
}
