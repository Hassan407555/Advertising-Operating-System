import type { AiSession, AiSessionStatus } from '@prisma/client';

import type {
  DraftCampaignIds,
  StoredGeneratedCampaign,
} from '../types/generated-campaign.types';

export interface AiSessionWorkflowContext {
  stepIndex: number;
  answers: Record<string, string>;
  plannedSteps: string[];
  /** Validated Gemini campaign JSON — set by Phase 6 generator only. */
  generatedCampaign?: StoredGeneratedCampaign;
  /** Draft entity IDs after Phase 7 Save Draft (create or update). */
  draftCampaignIds?: DraftCampaignIds;
}

export interface AiSessionWorkflowMetadata {
  definitionId: string;
  stepCatalogVersion: string;
  adaptiveRules: string[];
}

export interface ManagerMessageDraft {
  role: 'SYSTEM' | 'ASSISTANT' | 'USER';
  content: string;
  stepKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ManagerHandleInput {
  value?: string;
}

export interface ManagerHandleResult {
  status: AiSessionStatus;
  currentPhase: string;
  currentManager: string;
  workflowContext: AiSessionWorkflowContext;
  messages: ManagerMessageDraft[];
  completed?: boolean;
}

export interface AiSessionManager {
  readonly name: string;

  canHandle(session: AiSession): boolean;

  handle(
    session: AiSession,
    input: ManagerHandleInput,
    context: AiSessionWorkflowContext,
  ): Promise<ManagerHandleResult> | ManagerHandleResult;
}
