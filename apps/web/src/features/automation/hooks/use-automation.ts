"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
    queryKey: ["automation", "campaign-options"],
    queryFn: getAutomationCampaignOptions,
  });
}

export function useAutomationAdAccountOptionsQuery() {
  return useQuery({
    queryKey: ["automation", "ad-account-options"],
    queryFn: getAutomationAdAccountOptions,
  });
}

export function useRunCampaignWorkflowMutation() {
  return useMutation({
    mutationFn: runCampaignWorkflow,
  });
}

export function useRunPublishWorkflowMutation() {
  return useMutation({
    mutationFn: runPublishWorkflow,
  });
}

export function useRunFullWorkflowMutation() {
  return useMutation({
    mutationFn: runFullWorkflow,
  });
}

export function useWorkflowStatusQuery(runId?: string) {
  return useQuery({
    queryKey: ["automation", "workflow", runId],
    queryFn: () => getWorkflowStatus(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LIVE_STATUSES.has(status) ? 4000 : false;
    },
  });
}

export function useAutomationRunsQuery(query: AutomationRunsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUTOMATION_RUNS, query],
    queryFn: () => getAutomationRuns(query),
    placeholderData: (previous) => previous,
  });
}

export function useAutomationRunDetailsQuery(runId: string) {
  return useQuery({
    queryKey: ["automation", "run", runId],
    queryFn: () => getAutomationRunById(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LIVE_STATUSES.has(status) ? 4000 : false;
    },
  });
}
