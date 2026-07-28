import {
  AiSession,
  AiSessionMessage,
  Prisma,
} from '@prisma/client';

import {
  AiSessionMessageResponseDto,
  AiSessionResponseDto,
} from '../dto/ai-session.dto';

export class AiSessionMapper {
  static toMessageDto(message: AiSessionMessage): AiSessionMessageResponseDto {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      stepKey: message.stepKey,
      metadata:
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as Record<string, unknown>)
          : null,
      createdAt: message.createdAt,
    };
  }

  static toDto(
    session: AiSession & { messages?: AiSessionMessage[] },
    options?: { reusedExisting?: boolean },
  ): AiSessionResponseDto {
    return {
      id: session.id,
      organizationId: session.organizationId,
      shopifyStoreId: session.shopifyStoreId,
      productId: session.productId,
      createdByUserId: session.createdByUserId,
      sessionSource: session.sessionSource,
      status: session.status,
      currentManager: session.currentManager,
      currentPhase: session.currentPhase,
      workflowMetadata: (session.workflowMetadata ?? {}) as Record<string, unknown>,
      workflowContext: (session.workflowContext ?? {}) as Record<string, unknown>,
      workflowVersion: session.workflowVersion,
      promptVersions: (session.promptVersions ?? {}) as Record<string, string>,
      errorMessage: session.errorMessage,
      lastActivityAt: session.lastActivityAt,
      completedAt: session.completedAt,
      cancelledAt: session.cancelledAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages?.map((message) => this.toMessageDto(message)),
      reusedExisting: options?.reusedExisting,
    };
  }

  static asInputJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
