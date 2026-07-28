"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getAutomationRunById,
  getAutomationRuns,
  getWorkflowStatus,
  runCampaignWorkflow,
  runFullWorkflow,
  runPublishWorkflow,
} from "@/features/automation/api/automation.api";
import { getAutomationAdAccountOptions, getAutomationCampaignOptions } from "@/features/automation/api/automation-options.api";
import type { AutomationRunsQuery } from "@/features/automation/types/automation.types";

const LIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

export function useAutomationCampaignOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, "campaign-options"],
    queryFn: getAutomationCampaignOptions,
  });
}

export function useAutomationAdAccountOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, "ad-account-options"],
    queryFn: getAutomationAdAccountOptions,
  });
}

function useInvalidateAutomationQueries() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTOMATION_RUNS });
  };
}

export function useRunCampaignWorkflowMutation() {
  const invalidate = useInvalidateAutomationQueries();

  return useMutation({
    mutationFn: runCampaignWorkflow,
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useRunPublishWorkflowMutation() {
  const invalidate = useInvalidateAutomationQueries();

  return useMutation({
    mutationFn: runPublishWorkflow,
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useRunFullWorkflowMutation() {
  const invalidate = useInvalidateAutomationQueries();

  return useMutation({
    mutationFn: runFullWorkflow,
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useWorkflowStatusQuery(runId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, "workflow", runId],
    queryFn: () => getWorkflowStatus(runId!),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LIVE_STATUSES.has(status) ? 4000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useAutomationRunsQuery(query: AutomationRunsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, "list", query],
    queryFn: () => getAutomationRuns(query),
    placeholderData: (previous) => previous,
  });
}

export function useAutomationRunDetailsQuery(runId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, "run", runId],
    queryFn: () => getAutomationRunById(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LIVE_STATUSES.has(status) ? 4000 : false;
    },
    refetchIntervalInBackground: false,
  });
}
