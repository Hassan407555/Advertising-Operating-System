import { BadRequestException } from '@nestjs/common';

import type { AutomationActionContext } from '../interfaces/automation-action-handler.interface';

/**
 * Reads a required string from action config, then workflow state.
 */
export function requireString(
  context: AutomationActionContext,
  config: Record<string, unknown> | undefined,
  key: string,
): string {
  const fromConfig = config?.[key];
  if (typeof fromConfig === 'string' && fromConfig.trim()) {
    return fromConfig.trim();
  }

  const fromState = context.workflowState[key];
  if (typeof fromState === 'string' && fromState.trim()) {
    return fromState.trim();
  }

  throw new BadRequestException(
    `Automation action requires "${key}" in config or prior workflow state.`,
  );
}

export function optionalString(
  context: AutomationActionContext,
  config: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const fromConfig = config?.[key];
  if (typeof fromConfig === 'string' && fromConfig.trim()) {
    return fromConfig.trim();
  }

  const fromState = context.workflowState[key];
  if (typeof fromState === 'string' && fromState.trim()) {
    return fromState.trim();
  }

  return undefined;
}

export function resolveCampaignIds(
  context: AutomationActionContext,
  config?: Record<string, unknown>,
): string[] {
  const single = optionalString(context, config, 'campaignId');
  if (single) {
    return [single];
  }

  const fromState = context.workflowState.campaignIds;
  if (Array.isArray(fromState)) {
    return fromState.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
  }

  throw new BadRequestException(
    'Automation action requires campaignId or prior campaignIds in workflow state.',
  );
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
