import { BadRequestException } from '@nestjs/common';
import { AiSessionStatus } from '@prisma/client';

const TRANSITIONS: Record<AiSessionStatus, AiSessionStatus[]> = {
  [AiSessionStatus.CREATED]: [
    AiSessionStatus.AWAITING_INPUT,
    AiSessionStatus.INTERVIEWING,
    AiSessionStatus.CANCELLED,
    AiSessionStatus.FAILED,
  ],
  [AiSessionStatus.AWAITING_INPUT]: [
    AiSessionStatus.INTERVIEWING,
    AiSessionStatus.READY_FOR_ANALYSIS,
    AiSessionStatus.CANCELLED,
    AiSessionStatus.FAILED,
  ],
  [AiSessionStatus.INTERVIEWING]: [
    AiSessionStatus.AWAITING_INPUT,
    AiSessionStatus.READY_FOR_ANALYSIS,
    AiSessionStatus.CANCELLED,
    AiSessionStatus.FAILED,
  ],
  [AiSessionStatus.READY_FOR_ANALYSIS]: [
    AiSessionStatus.ANALYZING,
    AiSessionStatus.ARCHIVED,
    AiSessionStatus.CANCELLED,
    AiSessionStatus.FAILED,
  ],
  [AiSessionStatus.ANALYZING]: [
    AiSessionStatus.PLANNING,
    AiSessionStatus.FAILED,
    AiSessionStatus.CANCELLED,
  ],
  [AiSessionStatus.PLANNING]: [
    AiSessionStatus.BUILDING,
    AiSessionStatus.FAILED,
    AiSessionStatus.CANCELLED,
  ],
  [AiSessionStatus.BUILDING]: [
    AiSessionStatus.REVIEWING,
    AiSessionStatus.FAILED,
    AiSessionStatus.CANCELLED,
  ],
  [AiSessionStatus.REVIEWING]: [
    AiSessionStatus.AWAITING_APPROVAL,
    AiSessionStatus.FAILED,
    AiSessionStatus.CANCELLED,
  ],
  [AiSessionStatus.AWAITING_APPROVAL]: [
    AiSessionStatus.APPROVED,
    AiSessionStatus.FAILED,
    AiSessionStatus.CANCELLED,
  ],
  [AiSessionStatus.APPROVED]: [AiSessionStatus.ARCHIVED],
  [AiSessionStatus.FAILED]: [AiSessionStatus.ARCHIVED],
  [AiSessionStatus.CANCELLED]: [AiSessionStatus.ARCHIVED],
  [AiSessionStatus.ARCHIVED]: [],
};

export function assertAiSessionTransition(
  from: AiSessionStatus,
  to: AiSessionStatus,
): void {
  if (from === to) {
    return;
  }

  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid AI session transition from ${from} to ${to}.`,
    );
  }
}

/** Statuses that cannot be advanced via the interview orchestrator. */
export function isTerminalAiSessionStatus(status: AiSessionStatus): boolean {
  return (
    status === AiSessionStatus.READY_FOR_ANALYSIS ||
    status === AiSessionStatus.REVIEWING ||
    status === AiSessionStatus.APPROVED ||
    status === AiSessionStatus.FAILED ||
    status === AiSessionStatus.CANCELLED ||
    status === AiSessionStatus.ARCHIVED
  );
}

/** Interview complete — ready for Gemini campaign generation (Phase 6). */
export function isReadyForCampaignGeneration(status: AiSessionStatus): boolean {
  return status === AiSessionStatus.READY_FOR_ANALYSIS;
}

/** Phase 6 success — campaign JSON stored; Phase 7 review/save comes next. */
export function isReadyForReview(status: AiSessionStatus): boolean {
  return status === AiSessionStatus.REVIEWING;
}

/**
 * Phase 7 Save Draft — session stays in REVIEWING after save.
 * Draft creation is indicated by workflowContext.draftCampaignIds, not APPROVED.
 */
export function isReadyForSaveDraft(status: AiSessionStatus): boolean {
  return status === AiSessionStatus.REVIEWING;
}
