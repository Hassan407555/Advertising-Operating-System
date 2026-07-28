import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  AiSessionMessageRole,
  AiSessionSource,
  AiSessionStatus,
  Prisma,
} from '@prisma/client';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import { StoresService } from '../../stores/services/stores.service';
import {
  ACTIVE_AI_SESSION_STATUSES,
  AI_SESSION_DEFINITION_ID,
  AI_SESSION_WORKFLOW_VERSION,
  BASE_INTERVIEW_STEPS,
  CONVERSATION_MANAGER,
  CONVERSATION_PROMPT_VERSION,
} from '../constants/ai-session.constants';
import {
  AdvanceAiSessionDto,
  CreateAiSessionDto,
  ListAiSessionsQueryDto,
  AiSessionResponseDto,
  SaveAiSessionDraftDto,
} from '../dto/ai-session.dto';
import { AiSessionMapper } from '../mappers/ai-session.mapper';
import { AiOrchestrator } from '../orchestrator/ai.orchestrator';
import {
  assertAiSessionTransition,
  isReadyForCampaignGeneration,
  isReadyForSaveDraft,
  isTerminalAiSessionStatus,
} from '../state/ai-session.state-machine';
import { MetaCampaignGeneratorService } from './meta-campaign-generator.service';
import { SaveDraftCampaignService } from './save-draft-campaign.service';

@Injectable()
export class AiSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StoresService))
    private readonly storesService: StoresService,
    private readonly auditLogsService: AuditLogsService,
    private readonly orchestrator: AiOrchestrator,
    private readonly metaCampaignGenerator: MetaCampaignGeneratorService,
    private readonly saveDraftCampaign: SaveDraftCampaignService,
  ) {}

  async create(
    dto: CreateAiSessionDto,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const store = await this.storesService.getStore(dto.storeId, currentUser);
    if (!store.advertisingReady) {
      throw new BadRequestException(
        'Store must be advertising-ready before starting an AI session.',
      );
    }

    const product = await this.prisma.shopifyProduct.findFirst({
      where: {
        id: dto.productId,
        organizationId: currentUser.organizationId,
        platformConnectionId: dto.storeId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product was not found for this store and organization.',
      );
    }

    const existing = await this.prisma.aiSession.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        shopifyStoreId: dto.storeId,
        productId: dto.productId,
        status: { in: [...ACTIVE_AI_SESSION_STATUSES] as AiSessionStatus[] },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // Preserve original sessionSource on resume/reuse.
      return AiSessionMapper.toDto(existing, { reusedExisting: true });
    }

    const sessionSource = dto.sessionSource ?? AiSessionSource.PRODUCT_PAGE;

    const workflowMetadata = {
      definitionId: AI_SESSION_DEFINITION_ID,
      stepCatalogVersion: AI_SESSION_WORKFLOW_VERSION,
      adaptiveRules: ['carousel-steps', 'video-steps'],
    };

    const workflowContext = {
      stepIndex: 0,
      answers: {},
      plannedSteps: BASE_INTERVIEW_STEPS.map((step) => step.key),
    };

    const promptVersions = {
      [CONVERSATION_MANAGER]: CONVERSATION_PROMPT_VERSION,
    };

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.aiSession.create({
        data: {
          organizationId: currentUser.organizationId,
          shopifyStoreId: dto.storeId,
          productId: dto.productId,
          createdByUserId: currentUser.sub,
          sessionSource,
          status: AiSessionStatus.CREATED,
          currentManager: CONVERSATION_MANAGER,
          currentPhase: 'INTERVIEW',
          workflowMetadata: AiSessionMapper.asInputJson(workflowMetadata),
          workflowContext: AiSessionMapper.asInputJson(workflowContext),
          workflowVersion: AI_SESSION_WORKFLOW_VERSION,
          promptVersions: AiSessionMapper.asInputJson(promptVersions),
          lastActivityAt: new Date(),
          messages: {
            create: [
              {
                role: AiSessionMessageRole.SYSTEM,
                content:
                  'AI Advertising Agent session started. Guided interview begins.',
                stepKey: 'session_start',
              },
            ],
          },
        },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AI_SESSION_CREATED,
          entity: AuditEntity.AI_SESSION,
          entityId: created.id,
          metadata: {
            storeId: dto.storeId,
            productId: dto.productId,
            sessionSource,
            workflowVersion: AI_SESSION_WORKFLOW_VERSION,
          },
        },
        tx,
      );

      return created;
    });

    // Kick off first interview prompt via orchestrator (no user value yet).
    const advanced = await this.orchestrator.advance(session, {}, currentUser.sub);
    const withMessages = await this.prisma.aiSession.findUniqueOrThrow({
      where: { id: advanced.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.AI_SESSION_ADVANCED,
      entity: AuditEntity.AI_SESSION,
      entityId: withMessages.id,
      metadata: {
        status: withMessages.status,
        currentManager: withMessages.currentManager,
        bootstrap: true,
      },
    });

    return AiSessionMapper.toDto(withMessages, { reusedExisting: false });
  }

  async findActiveSessionId(params: {
    organizationId: string;
    storeId: string;
    productId: string;
  }): Promise<string | null> {
    const existing = await this.prisma.aiSession.findFirst({
      where: {
        organizationId: params.organizationId,
        shopifyStoreId: params.storeId,
        productId: params.productId,
        status: { in: [...ACTIVE_AI_SESSION_STATUSES] as AiSessionStatus[] },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    return existing?.id ?? null;
  }

  async list(
    query: ListAiSessionsQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AiSessionResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AiSessionWhereInput = {
      organizationId: currentUser.organizationId,
      ...(query.storeId ? { shopifyStoreId: query.storeId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.aiSession.count({ where }),
      this.prisma.aiSession.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => AiSessionMapper.toDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(
    id: string,
    currentUser: JwtPayload,
    includeMessages = true,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, includeMessages);
    return AiSessionMapper.toDto(session);
  }

  async resume(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, true);

    if (isTerminalAiSessionStatus(session.status)) {
      // Interview-complete / review / closed — return snapshot, no interview advance.
      return AiSessionMapper.toDto(session);
    }

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.AI_SESSION_RESUMED,
      entity: AuditEntity.AI_SESSION,
      entityId: session.id,
      metadata: {
        status: session.status,
        currentManager: session.currentManager,
      },
    });

    const updated = await this.prisma.aiSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return AiSessionMapper.toDto(updated);
  }

  async advance(
    id: string,
    dto: AdvanceAiSessionDto,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, false);

    if (isTerminalAiSessionStatus(session.status)) {
      if (isReadyForCampaignGeneration(session.status)) {
        throw new BadRequestException(
          'Interview is complete. Use POST /ai-sessions/:id/generate to create the campaign.',
        );
      }
      throw new BadRequestException(
        `Session is terminal (${session.status}) and cannot be advanced.`,
      );
    }

    const updated = await this.orchestrator.advance(
      session,
      { value: dto.value },
      currentUser.sub,
    );

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action:
        updated.status === AiSessionStatus.READY_FOR_ANALYSIS
          ? AuditAction.AI_SESSION_COMPLETED
          : AuditAction.AI_SESSION_ADVANCED,
      entity: AuditEntity.AI_SESSION,
      entityId: updated.id,
      metadata: {
        status: updated.status,
        currentManager: updated.currentManager,
        stepKey: (updated.workflowContext as { plannedSteps?: string[] })
          ?.plannedSteps,
      },
    });

    const withMessages = await this.prisma.aiSession.findUniqueOrThrow({
      where: { id: updated.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return AiSessionMapper.toDto(withMessages);
  }

  /**
   * Phase 6 — Gemini Meta campaign generation.
   * Stores validated JSON in workflowContext.generatedCampaign only (no draft entities).
   */
  async generateCampaign(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, false);

    if (!isReadyForCampaignGeneration(session.status)) {
      throw new BadRequestException(
        `Campaign generation requires status READY_FOR_ANALYSIS (current: ${session.status}).`,
      );
    }

    try {
      const updated = await this.metaCampaignGenerator.generate(
        session,
        currentUser,
      );

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.AI_SESSION_COMPLETED,
        entity: AuditEntity.AI_SESSION,
        entityId: updated.id,
        metadata: {
          status: updated.status,
          phase: 'campaign_generated',
          campaignType: (
            updated.workflowContext as {
              generatedCampaign?: { campaignType?: string };
            }
          )?.generatedCampaign?.campaignType,
        },
      });

      return AiSessionMapper.toDto(updated);
    } catch (error) {
      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.AI_SESSION_FAILED,
        entity: AuditEntity.AI_SESSION,
        entityId: id,
        metadata: {
          phase: 'campaign_generation',
          message: error instanceof Error ? error.message : 'Generation failed',
        },
      });
      throw error;
    }
  }

  /**
   * Phase 7 — Review & Save Draft.
   * Creates/updates Campaign → AdSet → Ad → Creative from reviewed payload.
   * Session remains REVIEWING; draftCampaignIds marks draft persistence.
   */
  async saveDraft(
    id: string,
    dto: SaveAiSessionDraftDto,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, false);

    if (!isReadyForSaveDraft(session.status)) {
      throw new BadRequestException(
        `Save draft requires status REVIEWING (current: ${session.status}).`,
      );
    }

    try {
      const updated = await this.saveDraftCampaign.saveDraft(
        session,
        dto.payload,
        currentUser,
      );

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.AI_SESSION_ADVANCED,
        entity: AuditEntity.AI_SESSION,
        entityId: updated.id,
        metadata: {
          status: updated.status,
          phase: 'save_draft',
          draftCampaignIds: (
            updated.workflowContext as {
              draftCampaignIds?: Record<string, string>;
            }
          )?.draftCampaignIds,
        },
      });

      return AiSessionMapper.toDto(updated);
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        await this.auditLogsService.log({
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AI_SESSION_FAILED,
          entity: AuditEntity.AI_SESSION,
          entityId: id,
          metadata: {
            phase: 'save_draft',
            message:
              error instanceof Error ? error.message : 'Save draft failed',
          },
        });
      }
      throw error;
    }
  }

  async cancel(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AiSessionResponseDto> {
    const session = await this.requireSession(id, currentUser, true);

    if (session.status === AiSessionStatus.CANCELLED) {
      return AiSessionMapper.toDto(session);
    }

    if (
      session.status === AiSessionStatus.APPROVED ||
      session.status === AiSessionStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        `Session status ${session.status} cannot be cancelled.`,
      );
    }

    assertAiSessionTransition(session.status, AiSessionStatus.CANCELLED);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.aiSession.update({
        where: { id: session.id },
        data: {
          status: AiSessionStatus.CANCELLED,
          cancelledAt: new Date(),
          lastActivityAt: new Date(),
          currentPhase: 'CANCELLED',
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AI_SESSION_CANCELLED,
          entity: AuditEntity.AI_SESSION,
          entityId: next.id,
          metadata: { previousStatus: session.status },
        },
        tx,
      );

      return next;
    });

    return AiSessionMapper.toDto(updated);
  }

  async listMessages(id: string, currentUser: JwtPayload) {
    await this.requireSession(id, currentUser, false);
    const messages = await this.prisma.aiSessionMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((message) => AiSessionMapper.toMessageDto(message));
  }

  private async requireSession(
    id: string,
    currentUser: JwtPayload,
    includeMessages: boolean,
  ) {
    const session = await this.prisma.aiSession.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
      include: includeMessages
        ? { messages: { orderBy: { createdAt: 'asc' } } }
        : undefined,
    });

    if (!session) {
      throw new NotFoundException('AI session was not found.');
    }

    return session;
  }
}
