import { AutomationTriggerType } from '@prisma/client';

export interface AutomationTriggerPayload {
  type: AutomationTriggerType;
  pipelineId: string;
  metadata?: Record<string, unknown>;
}
