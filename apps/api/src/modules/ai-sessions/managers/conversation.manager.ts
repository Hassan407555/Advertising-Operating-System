import { BadRequestException, Injectable } from '@nestjs/common';
import { AiSession, AiSessionStatus } from '@prisma/client';

import {
  BASE_INTERVIEW_STEPS,
  CAROUSEL_STEPS,
  CONVERSATION_MANAGER,
  VIDEO_STEPS,
  type InterviewStepDefinition,
} from '../constants/ai-session.constants';
import type {
  AiSessionManager,
  AiSessionWorkflowContext,
  ManagerHandleInput,
  ManagerHandleResult,
} from './ai-session-manager.interface';

@Injectable()
export class ConversationManager implements AiSessionManager {
  readonly name = CONVERSATION_MANAGER;

  canHandle(session: AiSession): boolean {
    return (
      session.currentManager === this.name &&
      (session.status === AiSessionStatus.CREATED ||
        session.status === AiSessionStatus.AWAITING_INPUT ||
        session.status === AiSessionStatus.INTERVIEWING)
    );
  }

  handle(
    session: AiSession,
    input: ManagerHandleInput,
    context: AiSessionWorkflowContext,
  ): ManagerHandleResult {
    const steps = this.resolveSteps(context);
    let stepIndex = context.stepIndex ?? 0;
    const answers = { ...(context.answers ?? {}) };
    const messages: ManagerHandleResult['messages'] = [];

    if (stepIndex >= steps.length) {
      return {
        status: AiSessionStatus.READY_FOR_ANALYSIS,
        currentPhase: 'READY_FOR_ANALYSIS',
        currentManager: this.name,
        workflowContext: {
          stepIndex,
          answers,
          plannedSteps: steps.map((step) => step.key),
        },
        messages: [
          {
            role: 'ASSISTANT',
            content:
              'Interview complete. Session is ready for product analysis.',
            stepKey: 'complete',
          },
        ],
        completed: true,
      };
    }

    const currentStep = steps[stepIndex];

    if (input.value !== undefined) {
      const normalized = String(input.value).trim();
      if (!normalized) {
        throw new BadRequestException(`A value is required for ${currentStep.key}.`);
      }

      if (currentStep.key === 'adType') {
        const adType = normalized.toUpperCase();
        if (!['IMAGE', 'CAROUSEL', 'VIDEO'].includes(adType)) {
          throw new BadRequestException('adType must be IMAGE, CAROUSEL, or VIDEO.');
        }
        answers.adType = adType;
      } else if (currentStep.key === 'dailyBudget') {
        const budget = Number(normalized);
        if (!Number.isFinite(budget) || budget <= 0) {
          throw new BadRequestException('dailyBudget must be a positive number.');
        }
        answers.dailyBudget = String(budget);
      } else {
        answers[currentStep.key] = normalized;
      }

      messages.push({
        role: 'USER',
        content: normalized,
        stepKey: currentStep.key,
      });

      stepIndex += 1;

      // Rebuild adaptive plan after adType is known.
      const planned = this.resolveSteps({
        stepIndex,
        answers,
        plannedSteps: context.plannedSteps,
      });

      if (stepIndex >= planned.length) {
        messages.push({
          role: 'ASSISTANT',
          content:
            'Thanks. The guided interview is complete. This session is ready for analysis.',
          stepKey: 'complete',
        });

        return {
          status: AiSessionStatus.READY_FOR_ANALYSIS,
          currentPhase: 'READY_FOR_ANALYSIS',
          currentManager: this.name,
          workflowContext: {
            stepIndex,
            answers,
            plannedSteps: planned.map((step) => step.key),
          },
          messages,
          completed: true,
        };
      }

      const nextStep = planned[stepIndex];
      messages.push({
        role: 'ASSISTANT',
        content: nextStep.prompt,
        stepKey: nextStep.key,
      });

      return {
        status: AiSessionStatus.INTERVIEWING,
        currentPhase: 'INTERVIEW',
        currentManager: this.name,
        workflowContext: {
          stepIndex,
          answers,
          plannedSteps: planned.map((step) => step.key),
        },
        messages,
      };
    }

    // No input: ask/re-ask current step (resume / first prompt).
    messages.push({
      role: 'ASSISTANT',
      content: currentStep.prompt,
      stepKey: currentStep.key,
    });

    return {
      status:
        session.status === AiSessionStatus.CREATED
          ? AiSessionStatus.AWAITING_INPUT
          : AiSessionStatus.AWAITING_INPUT,
      currentPhase: 'INTERVIEW',
      currentManager: this.name,
      workflowContext: {
        stepIndex,
        answers,
        plannedSteps: steps.map((step) => step.key),
      },
      messages,
    };
  }

  private resolveSteps(context: AiSessionWorkflowContext): InterviewStepDefinition[] {
    const adType = (context.answers?.adType ?? '').toUpperCase();
    if (adType === 'CAROUSEL') {
      return [...BASE_INTERVIEW_STEPS, ...CAROUSEL_STEPS];
    }
    if (adType === 'VIDEO') {
      return [...BASE_INTERVIEW_STEPS, ...VIDEO_STEPS];
    }
    return [...BASE_INTERVIEW_STEPS];
  }
}
