import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AiSession,
  AiSessionMessageRole,
  AiSessionStatus,
  PlatformType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../ai/services/ai.service';
import { StoresService } from '../../stores/services/stores.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { META_CAMPAIGN_GENERATOR_PROMPT_VERSION } from '../constants/ai-session.constants';
import { MetaCampaignPromptBuilder } from '../prompts/meta-campaign-prompt.builder';
import { validateGeneratedCampaign } from '../schemas/generated-campaign.schema';
import { assertAiSessionTransition } from '../state/ai-session.state-machine';
import type { AiSessionWorkflowContext } from '../managers/ai-session-manager.interface';
import type {
  MetaCampaignAdType,
  MetaCampaignGeneratorAnalyticsInput,
  MetaCampaignGeneratorInputs,
  StoredGeneratedCampaign,
} from '../types/generated-campaign.types';

const GEMINI_TIMEOUT_MS = 60_000;
const GENERATION_MAX_OUTPUT_TOKENS = 4096;

@Injectable()
export class MetaCampaignGeneratorService {
  private readonly logger = new Logger(MetaCampaignGeneratorService.name);
  private readonly promptBuilder = new MetaCampaignPromptBuilder();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Generates a Meta campaign via Gemini and stores validated JSON on the session.
   * Does NOT create Campaign / AdSet / Ad / Creative draft entities (Phase 7).
   */
  async generate(
    session: AiSession,
    currentUser: JwtPayload,
  ): Promise<AiSession> {
    if (session.status !== AiSessionStatus.READY_FOR_ANALYSIS &&
        session.status !== AiSessionStatus.REVIEWING &&
        session.status !== AiSessionStatus.FAILED) {
      throw new BadRequestException(
        `Campaign generation requires status READY_FOR_ANALYSIS, REVIEWING, or FAILED (current: ${session.status}).`,
      );
    }

    const store = await this.storesService.getStore(
      session.shopifyStoreId,
      currentUser,
    );
    if (!store.capabilities.shopifyConnected) {
      throw new BadRequestException(
        'Shopify must be connected before campaign generation.',
      );
    }
    if (!store.capabilities.productsSynced) {
      throw new BadRequestException(
        'Products must be synced before campaign generation.',
      );
    }

    const context = this.readContext(session);
    const campaignType = this.resolveCampaignType(context.answers);

    assertAiSessionTransition(
      session.status,
      AiSessionStatus.ANALYZING,
    );

    await this.prisma.aiSession.update({
      where: { id: session.id },
      data: {
        status: AiSessionStatus.ANALYZING,
        currentPhase: 'GENERATING',
        currentManager: 'metaCampaignGenerator',
        lastActivityAt: new Date(),
        errorMessage: null,
        promptVersions: {
          ...((session.promptVersions as Record<string, string> | null) ?? {}),
          metaCampaignGenerator: META_CAMPAIGN_GENERATOR_PROMPT_VERSION,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      await this.transitionStatus(session.id, AiSessionStatus.PLANNING);
      const inputs = await this.collectInputs(session, currentUser, context);
      const prompt = this.promptBuilder.build(inputs);
      const temperature = inputs.isRegeneration ? 0.75 : 0.4;

      await this.transitionStatus(session.id, AiSessionStatus.BUILDING);

      const geminiResult = await this.callGeminiWithTimeout(prompt, temperature);

      const validated = validateGeneratedCampaign(
        campaignType,
        geminiResult.data,
      );

      const stored: StoredGeneratedCampaign = {
        campaignType,
        payload: validated,
        generatedAt: new Date().toISOString(),
        model: geminiResult.model,
        provider: geminiResult.provider,
      };

      const nextContext: AiSessionWorkflowContext = {
        ...context,
        generatedCampaign: stored,
      };

      assertAiSessionTransition(
        AiSessionStatus.BUILDING,
        AiSessionStatus.REVIEWING,
      );

      return this.prisma.$transaction(async (tx) => {
        await tx.aiSessionMessage.create({
          data: {
            sessionId: session.id,
            role: AiSessionMessageRole.ASSISTANT,
            content:
              'Meta campaign generated successfully. Ready for review.',
            stepKey: 'campaign_generated',
            metadata: {
              campaignType,
              campaignName: validated.campaignName,
              model: geminiResult.model,
            } as Prisma.InputJsonValue,
          },
        });

        return tx.aiSession.update({
          where: { id: session.id },
          data: {
            status: AiSessionStatus.REVIEWING,
            currentPhase: 'REVIEWING',
            currentManager: 'metaCampaignGenerator',
            workflowContext: nextContext as unknown as Prisma.InputJsonValue,
            lastActivityAt: new Date(),
            completedAt: new Date(),
            errorMessage: null,
          },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        });
      });
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.logger.error(
        `Campaign generation failed for session ${session.id}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.markFailed(session.id, message);
      throw error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
        ? error
        : new InternalServerErrorException(message);
    }
  }

  private async collectInputs(
    session: AiSession,
    currentUser: JwtPayload,
    context: AiSessionWorkflowContext,
  ): Promise<MetaCampaignGeneratorInputs> {
    const product = await this.prisma.shopifyProduct.findFirst({
      where: {
        id: session.productId,
        organizationId: currentUser.organizationId,
        platformConnectionId: session.shopifyStoreId,
        deletedAt: null,
      },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product was not found for this store and organization.',
      );
    }

    const storeSummary = await this.storesService.getStore(
      session.shopifyStoreId,
      currentUser,
    );
    const advertisingConfiguration =
      await this.storesService.getAdvertisingConfiguration(
        session.shopifyStoreId,
        currentUser,
      );

    const analytics = await this.collectAnalytics(currentUser.organizationId);
    const campaignType = this.resolveCampaignType(context.answers);

    return {
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags ?? [],
        featuredImageUrl: product.featuredImageUrl,
        images: product.images.map((image) => ({
          url: image.url,
          alt: image.alt,
        })),
        variants: product.variants.map((variant) => ({
          title: variant.title,
          price:
            variant.price !== null && variant.price !== undefined
              ? variant.price.toString()
              : null,
          inventoryQuantity: variant.inventoryQuantity,
          sku: variant.sku,
        })),
      },
      analytics,
      store: {
        storeId: storeSummary.id,
        brand: storeSummary.name,
        currency: null,
        advertisingConfiguration: advertisingConfiguration
          ? {
              metaBusinessId: advertisingConfiguration.metaBusinessId,
              adAccountId: advertisingConfiguration.adAccountId,
              facebookPageId: advertisingConfiguration.facebookPageId,
              instagramAccountId: advertisingConfiguration.instagramAccountId,
              pixelId: advertisingConfiguration.pixelId,
              catalogId: advertisingConfiguration.catalogId,
            }
          : null,
      },
      interviewAnswers: { ...context.answers },
      campaignType,
      isRegeneration: Boolean(context.generatedCampaign),
    };
  }

  private async collectAnalytics(
    organizationId: string,
  ): Promise<MetaCampaignGeneratorAnalyticsInput> {
    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        organizationId,
        platform: PlatformType.META,
      },
      orderBy: { snapshotDate: 'desc' },
      take: 30,
    });

    if (snapshots.length === 0) {
      return {
        available: false,
        revenue: null,
        roas: null,
        spend: null,
        ctr: null,
        cpc: null,
        cpm: null,
        orders: null,
        conversions: null,
        impressions: null,
        clicks: null,
        snapshotCount: 0,
      };
    }

    let spend = 0;
    let revenue = 0;
    let conversions = 0;
    let impressions = 0;
    let clicks = 0;
    let cpcSum = 0;
    let cpcCount = 0;
    let cpmSum = 0;
    let cpmCount = 0;
    let ctrSum = 0;
    let ctrCount = 0;
    let roasSum = 0;
    let roasCount = 0;

    for (const snapshot of snapshots) {
      spend += Number(snapshot.spend ?? 0);
      revenue += Number(snapshot.revenue ?? 0);
      conversions += Number(snapshot.conversions ?? 0);
      impressions += snapshot.impressions ?? 0;
      clicks += snapshot.clicks ?? 0;

      if (snapshot.cpc != null) {
        cpcSum += Number(snapshot.cpc);
        cpcCount += 1;
      }
      if (snapshot.cpm != null) {
        cpmSum += Number(snapshot.cpm);
        cpmCount += 1;
      }
      if (snapshot.ctr != null) {
        ctrSum += Number(snapshot.ctr);
        ctrCount += 1;
      }
      if (snapshot.roas != null) {
        roasSum += Number(snapshot.roas);
        roasCount += 1;
      }
    }

    return {
      available: true,
      revenue: roundMetric(revenue),
      roas: roasCount > 0 ? roundMetric(roasSum / roasCount) : spend > 0 ? roundMetric(revenue / spend) : null,
      spend: roundMetric(spend),
      ctr: ctrCount > 0 ? roundMetric(ctrSum / ctrCount) : null,
      cpc: cpcCount > 0 ? roundMetric(cpcSum / cpcCount) : null,
      cpm: cpmCount > 0 ? roundMetric(cpmSum / cpmCount) : null,
      orders: roundMetric(conversions),
      conversions: roundMetric(conversions),
      impressions,
      clicks,
      snapshotCount: snapshots.length,
    };
  }

  private async callGeminiWithTimeout(
    prompt: {
      systemPrompt: string;
      userPrompt: string;
      schemaHint: string;
    },
    temperature = 0.4,
  ) {
    try {
      return await Promise.race([
        this.aiService.generateJson({
          systemPrompt: prompt.systemPrompt,
          prompt: prompt.userPrompt,
          schemaHint: prompt.schemaHint,
          maxOutputTokens: GENERATION_MAX_OUTPUT_TOKENS,
          temperature,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new InternalServerErrorException(
                'Gemini timed out while generating the campaign.',
              ),
            );
          }, GEMINI_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Gemini API request failed.';
      throw new InternalServerErrorException(message);
    }
  }

  private resolveCampaignType(
    answers: Record<string, string>,
  ): MetaCampaignAdType {
    const adType = String(answers.adType ?? '').toUpperCase();
    if (
      adType === 'IMAGE' ||
      adType === 'CAROUSEL' ||
      adType === 'VIDEO' ||
      adType === 'NONE'
    ) {
      return adType;
    }
    throw new BadRequestException(
      'Interview answers are missing a valid adType (IMAGE, CAROUSEL, VIDEO, or NONE).',
    );
  }

  private readContext(session: AiSession): AiSessionWorkflowContext {
    const raw = session.workflowContext as Partial<AiSessionWorkflowContext> | null;
    return {
      stepIndex: typeof raw?.stepIndex === 'number' ? raw.stepIndex : 0,
      answers:
        raw?.answers && typeof raw.answers === 'object' ? raw.answers : {},
      plannedSteps: Array.isArray(raw?.plannedSteps) ? raw.plannedSteps : [],
      generatedCampaign: raw?.generatedCampaign,
    };
  }

  private async transitionStatus(
    sessionId: string,
    status: AiSessionStatus,
  ): Promise<void> {
    await this.prisma.aiSession.update({
      where: { id: sessionId },
      data: {
        status,
        lastActivityAt: new Date(),
      },
    });
  }

  private async markFailed(sessionId: string, message: string): Promise<void> {
    try {
      await this.prisma.aiSession.update({
        where: { id: sessionId },
        data: {
          status: AiSessionStatus.FAILED,
          currentPhase: 'FAILED',
          errorMessage: message.slice(0, 2000),
          lastActivityAt: new Date(),
        },
      });
    } catch (persistError) {
      this.logger.error(
        `Failed to persist FAILED status for session ${sessionId}`,
        persistError instanceof Error ? persistError.stack : undefined,
      );
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const message = (response as { message: string | string[] }).message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Campaign generation failed.';
  }
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}
