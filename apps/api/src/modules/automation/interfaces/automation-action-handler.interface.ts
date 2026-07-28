import { AutomationActionType } from '@prisma/client';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export interface AutomationActionContext {
  organizationId: string;
  runId: string;
  stepId: string;
  pipelineId: string;
  triggeredByUserId?: string;
  /** Authenticated caller — required so handlers can call domain services. */
  currentUser: JwtPayload;
  /**
   * Shared mutable bag across sequential steps.
   * Seeded from run metadata; each step may merge its output into it.
   */
  workflowState: Record<string, unknown>;
}

export interface AutomationActionDefinition {
  type: AutomationActionType;
  config?: Record<string, unknown>;
}

export interface AutomationActionResult {
  output?: Record<string, unknown>;
}

export interface AutomationActionHandler {
  readonly type: AutomationActionType;

  execute(
    definition: AutomationActionDefinition,
    context: AutomationActionContext,
  ): Promise<AutomationActionResult>;
}
