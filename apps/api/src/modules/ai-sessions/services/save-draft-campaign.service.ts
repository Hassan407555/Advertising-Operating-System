import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdSetStatus,
  AdStatus,
  AiSession,
  AiSessionMessageRole,
  AiSessionStatus,
  AuditAction,
  AuditEntity,
  CampaignStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import { StoresService } from '../../stores/services/stores.service';
import {
  SAVE_DRAFT_MANAGER,
  SAVE_DRAFT_PHASE,
} from '../constants/ai-session.constants';
import type { AiSessionWorkflowContext } from '../managers/ai-session-manager.interface';
import { AiSessionMapper } from '../mappers/ai-session.mapper';
import {
  asPrismaJson,
  mapGeneratedCampaignToDraft,
} from '../mappers/generated-campaign-to-draft.mapper';
import { validateGeneratedCampaign } from '../schemas/generated-campaign.schema';
import { isReadyForSaveDraft } from '../state/ai-session.state-machine';
import type {
  DraftCampaignIds,
  StoredGeneratedCampaign,
} from '../types/generated-campaign.types';

/**
 * Schema requires externalId on Campaign / AdSet / Ad (non-nullable).
 * Use a stable pending marker scoped to the AI session — not a fake Meta ID.
 * Creative.externalId is optional and left unset.
 */
function pendingExternalId(sessionId: string, kind: 'campaign' | 'adset' | 'ad') {
  return `pending:ai-session:${sessionId}:${kind}`;
}

@Injectable()
export class SaveDraftCampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Phase 7 — Review & Save Draft.
   * Creates or updates Campaign → AdSet → Ad → Creative from reviewed payload.
   * Keeps session status REVIEWING; records draftCampaignIds on workflowContext.
   */
  async saveDraft(
    session: AiSession,
    payloadRaw: unknown,
    currentUser: JwtPayload,
  ): Promise<AiSession> {
    if (!isReadyForSaveDraft(session.status)) {
      throw new BadRequestException(
        `Save draft requires status REVIEWING (current: ${session.status}).`,
      );
    }

    const context = this.readContext(session);
    if (!context.generatedCampaign) {
      throw new BadRequestException(
        'No generated campaign found on this session. Generate a campaign before saving a draft.',
      );
    }

    const campaignType = context.generatedCampaign.campaignType;
    const validatedPayload = validateGeneratedCampaign(campaignType, payloadRaw);

    if (validatedPayload.campaignType !== campaignType) {
      throw new BadRequestException(
        `Payload campaignType must match session campaign type (${campaignType}).`,
      );
    }

    const store = await this.storesService.getStore(
      session.shopifyStoreId,
      currentUser,
    );
    if (!store.advertisingReady) {
      throw new BadRequestException(
        'Store must be advertising-ready before saving a draft campaign.',
      );
    }

    const adConfig = await this.storesService.getAdvertisingConfiguration(
      session.shopifyStoreId,
      currentUser,
    );
    const adAccountId = adConfig?.adAccountId;
    if (!adAccountId) {
      throw new BadRequestException(
        'Store advertising configuration is missing an ad account. Configure advertising before saving.',
      );
    }

    const mapped = mapGeneratedCampaignToDraft({
      organizationId: session.organizationId,
      aiSessionId: session.id,
      shopifyStoreId: session.shopifyStoreId,
      productId: session.productId,
      adAccountId,
      campaignType,
      payload: validatedPayload,
    });

    const existingIds = this.readDraftIds(context);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const draftIds = existingIds
          ? await this.updateDraftEntities(
              tx,
              session,
              existingIds,
              adAccountId,
              mapped,
            )
          : await this.createDraftEntities(
              tx,
              session,
              adAccountId,
              mapped,
            );

        const nextGenerated: StoredGeneratedCampaign = {
          ...context.generatedCampaign!,
          campaignType,
          payload: validatedPayload,
        };

        const nextContext: AiSessionWorkflowContext = {
          ...context,
          generatedCampaign: nextGenerated,
          draftCampaignIds: draftIds,
        };

        const updated = await tx.aiSession.update({
          where: { id: session.id },
          data: {
            // Stay in REVIEWING — a saved draft is not approved/published.
            status: AiSessionStatus.REVIEWING,
            currentPhase: SAVE_DRAFT_PHASE,
            currentManager: SAVE_DRAFT_MANAGER,
            workflowContext: AiSessionMapper.asInputJson(nextContext),
            lastActivityAt: new Date(),
            errorMessage: null,
          },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        });

        await tx.aiSessionMessage.create({
          data: {
            sessionId: session.id,
            role: AiSessionMessageRole.ASSISTANT,
            content: existingIds
              ? 'Draft campaign updated from your review edits.'
              : 'Draft campaign saved. You can keep editing and save again.',
            stepKey: 'draft_saved',
            metadata: AiSessionMapper.asInputJson({
              draftCampaignIds: draftIds,
              updated: Boolean(existingIds),
            }),
          },
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: existingIds
              ? AuditAction.CAMPAIGN_UPDATED
              : AuditAction.CAMPAIGN_CREATED,
            entity: AuditEntity.CAMPAIGN,
            entityId: draftIds.campaignId,
            metadata: {
              aiSessionId: session.id,
              phase: 'save_draft',
              updated: Boolean(existingIds),
              campaignType,
              draftCampaignIds: { ...draftIds },
            },
          },
          tx,
        );

        return tx.aiSession.findUniqueOrThrow({
          where: { id: updated.id },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw error;
    }
  }

  private async createDraftEntities(
    tx: Prisma.TransactionClient,
    session: AiSession,
    adAccountId: string,
    mapped: ReturnType<typeof mapGeneratedCampaignToDraft>,
  ): Promise<DraftCampaignIds> {
    const creative = await tx.creative.create({
      data: {
        organizationId: session.organizationId,
        name: mapped.creative.name,
        type: mapped.creative.type,
        headline: mapped.creative.headline,
        primaryText: mapped.creative.primaryText,
        description: mapped.creative.description,
        callToAction: mapped.creative.callToAction,
        metadata: asPrismaJson(mapped.creative.metadata),
      },
    });

    const campaign = await tx.campaign.create({
      data: {
        organizationId: session.organizationId,
        adAccountId,
        shopifyStoreId: mapped.campaign.shopifyStoreId,
        // Required by schema; not a Meta platform ID.
        externalId: pendingExternalId(session.id, 'campaign'),
        name: mapped.campaign.name,
        objective: mapped.campaign.objective,
        status: CampaignStatus.DRAFT,
        dailyBudget: mapped.campaign.dailyBudget,
        currency: mapped.campaign.currency,
        metadata: asPrismaJson(mapped.campaign.metadata),
      },
    });

    const adSet = await tx.adSet.create({
      data: {
        organizationId: session.organizationId,
        campaignId: campaign.id,
        externalId: pendingExternalId(session.id, 'adset'),
        name: mapped.adSet.name,
        status: AdSetStatus.DRAFT,
        targeting: asPrismaJson(mapped.adSet.targeting),
        metadata: asPrismaJson(mapped.adSet.metadata),
        // Budget lives on Campaign only — do not duplicate here.
      },
    });

    const ad = await tx.ad.create({
      data: {
        organizationId: session.organizationId,
        adSetId: adSet.id,
        creativeId: creative.id,
        externalId: pendingExternalId(session.id, 'ad'),
        name: mapped.ad.name,
        status: AdStatus.DRAFT,
        metadata: asPrismaJson(mapped.ad.metadata),
      },
    });

    return {
      campaignId: campaign.id,
      adSetId: adSet.id,
      adId: ad.id,
      creativeId: creative.id,
    };
  }

  private async updateDraftEntities(
    tx: Prisma.TransactionClient,
    session: AiSession,
    ids: DraftCampaignIds,
    adAccountId: string,
    mapped: ReturnType<typeof mapGeneratedCampaignToDraft>,
  ): Promise<DraftCampaignIds> {
    const campaign = await tx.campaign.findFirst({
      where: {
        id: ids.campaignId,
        organizationId: session.organizationId,
        deletedAt: null,
      },
    });
    if (!campaign) {
      throw new NotFoundException(
        'Previously saved draft campaign was not found. Cannot update draft.',
      );
    }

    const adSet = await tx.adSet.findFirst({
      where: {
        id: ids.adSetId,
        organizationId: session.organizationId,
        campaignId: ids.campaignId,
        deletedAt: null,
      },
    });
    if (!adSet) {
      throw new NotFoundException(
        'Previously saved draft ad set was not found. Cannot update draft.',
      );
    }

    const ad = await tx.ad.findFirst({
      where: {
        id: ids.adId,
        organizationId: session.organizationId,
        adSetId: ids.adSetId,
        deletedAt: null,
      },
    });
    if (!ad) {
      throw new NotFoundException(
        'Previously saved draft ad was not found. Cannot update draft.',
      );
    }

    const creative = await tx.creative.findFirst({
      where: {
        id: ids.creativeId,
        organizationId: session.organizationId,
        deletedAt: null,
      },
    });
    if (!creative) {
      throw new NotFoundException(
        'Previously saved draft creative was not found. Cannot update draft.',
      );
    }

    await tx.creative.update({
      where: { id: creative.id },
      data: {
        name: mapped.creative.name,
        type: mapped.creative.type,
        headline: mapped.creative.headline,
        primaryText: mapped.creative.primaryText,
        description: mapped.creative.description,
        callToAction: mapped.creative.callToAction,
        metadata: asPrismaJson(mapped.creative.metadata),
      },
    });

    await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        adAccountId,
        shopifyStoreId: mapped.campaign.shopifyStoreId,
        name: mapped.campaign.name,
        objective: mapped.campaign.objective,
        status: CampaignStatus.DRAFT,
        dailyBudget: mapped.campaign.dailyBudget,
        currency: mapped.campaign.currency,
        metadata: asPrismaJson(mapped.campaign.metadata),
        // externalId left unchanged
      },
    });

    await tx.adSet.update({
      where: { id: adSet.id },
      data: {
        name: mapped.adSet.name,
        status: AdSetStatus.DRAFT,
        targeting: asPrismaJson(mapped.adSet.targeting),
        metadata: asPrismaJson(mapped.adSet.metadata),
        dailyBudget: null,
        lifetimeBudget: null,
      },
    });

    await tx.ad.update({
      where: { id: ad.id },
      data: {
        creativeId: creative.id,
        name: mapped.ad.name,
        status: AdStatus.DRAFT,
        metadata: asPrismaJson(mapped.ad.metadata),
      },
    });

    return ids;
  }

  private readContext(session: AiSession): AiSessionWorkflowContext {
    const raw = session.workflowContext;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { stepIndex: 0, answers: {}, plannedSteps: [] };
    }
    return raw as unknown as AiSessionWorkflowContext;
  }

  private readDraftIds(
    context: AiSessionWorkflowContext,
  ): DraftCampaignIds | null {
    const ids = context.draftCampaignIds;
    if (
      !ids ||
      typeof ids.campaignId !== 'string' ||
      typeof ids.adSetId !== 'string' ||
      typeof ids.adId !== 'string' ||
      typeof ids.creativeId !== 'string'
    ) {
      return null;
    }
    return ids;
  }
}
