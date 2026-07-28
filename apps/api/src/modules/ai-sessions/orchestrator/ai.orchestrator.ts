import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AiSession,
  AiSessionMessageRole,
  AiSessionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { assertAiSessionTransition } from '../state/ai-session.state-machine';
import type {
  AiSessionWorkflowContext,
  ManagerHandleInput,
} from '../managers/ai-session-manager.interface';
import { AiSessionManagerRegistry } from './ai-session-manager.registry';

@Injectable()
export class AiOrchestrator {
  private readonly logger = new Logger(AiOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly managerRegistry: AiSessionManagerRegistry,
  ) {}

  async advance(
    session: AiSession,
    input: ManagerHandleInput,
    actorId: string,
  ): Promise<AiSession> {
    const manager = this.managerRegistry.require(session.currentManager);

    if (!manager.canHandle(session)) {
      throw new BadRequestException(
        `Manager "${manager.name}" cannot handle session status ${session.status}.`,
      );
    }

    const context = this.readContext(session);
    const result = await manager.handle(session, input, context);

    assertAiSessionTransition(session.status, result.status);

    return this.prisma.$transaction(async (tx) => {
      for (const message of result.messages) {
        await tx.aiSessionMessage.create({
          data: {
            sessionId: session.id,
            role: message.role as AiSessionMessageRole,
            content: message.content,
            stepKey: message.stepKey,
            metadata: (message.metadata ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          },
        });
      }

      const updated = await tx.aiSession.update({
        where: { id: session.id },
        data: {
          status: result.status,
          currentManager: result.currentManager,
          currentPhase: result.currentPhase,
          workflowContext: result.workflowContext as unknown as Prisma.InputJsonValue,
          lastActivityAt: new Date(),
          completedAt:
            result.status === AiSessionStatus.READY_FOR_ANALYSIS
              ? new Date()
              : session.completedAt,
          errorMessage:
            result.status === AiSessionStatus.FAILED
              ? session.errorMessage
              : null,
        },
      });

      this.logger.debug(
        `Session ${session.id} advanced by ${manager.name} → ${result.status} (actor=${actorId})`,
      );

      return updated;
    });
  }

  private readContext(session: AiSession): AiSessionWorkflowContext {
    const raw = session.workflowContext as Partial<AiSessionWorkflowContext> | null;
    return {
      stepIndex: typeof raw?.stepIndex === 'number' ? raw.stepIndex : 0,
      answers: raw?.answers && typeof raw.answers === 'object' ? raw.answers : {},
      plannedSteps: Array.isArray(raw?.plannedSteps) ? raw.plannedSteps : [],
    };
  }
}
