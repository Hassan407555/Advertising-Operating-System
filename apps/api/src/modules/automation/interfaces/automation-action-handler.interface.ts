import { AutomationActionType } from '@prisma/client';

export interface AutomationActionContext {
  organizationId: string;
  runId: string;
  stepId: string;
  pipelineId: string;
  triggeredByUserId?: string;
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
