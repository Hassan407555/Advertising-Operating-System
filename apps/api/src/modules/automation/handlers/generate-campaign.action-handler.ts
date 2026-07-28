import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import {
  AutomationActionType,
  CallToAction,
  CreativeType,
  Currency,
  PlatformType,
} from '@prisma/client';

import { CampaignGeneratorService } from '../../campaign-generator/services/campaign-generator.service';
import { GenerateCampaignDto } from '../../campaign-generator/dto/generate-campaign.dto';
import { MarketingGoal } from '../../campaign-generator/enums/marketing-goal.enum';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import type {
  AutomationActionContext,
  AutomationActionDefinition,
  AutomationActionHandler,
  AutomationActionResult,
} from '../interfaces/automation-action-handler.interface';
import { asRecord } from '../utils/automation-config.util';

@Injectable()
export class GenerateCampaignActionHandler
  implements AutomationActionHandler, OnModuleInit
{
  readonly type = AutomationActionType.GENERATE_CAMPAIGN;

  constructor(
    private readonly registry: AutomationActionRegistry,
    private readonly campaignGeneratorService: CampaignGeneratorService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(
    definition: AutomationActionDefinition,
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const config = {
      ...context.workflowState,
      ...(definition.config ?? {}),
    };

    const dto = this.toDto(config);
    const result = await this.campaignGeneratorService.generate(
      dto,
      context.currentUser,
    );

    const campaignIds = result.campaigns.map((campaign) => campaign.id);
    const campaignsByPlatform: Record<string, string> = {};
    for (const campaign of result.campaigns) {
      campaignsByPlatform[campaign.platform] = campaign.id;
    }

    return {
      output: {
        campaigns: result.campaigns,
        campaignIds,
        campaignsByPlatform,
        adSets: result.adSets,
        ads: result.ads,
        creatives: result.creatives,
        campaignId: campaignIds[0],
      },
    };
  }

  private toDto(config: Record<string, unknown>): GenerateCampaignDto {
    const productId = config.productId;
    if (typeof productId !== 'string' || !productId.trim()) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires productId.',
      );
    }

    const countries = config.countries;
    if (!Array.isArray(countries) || countries.length === 0) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires countries[].',
      );
    }

    const platforms = config.platforms;
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires platforms[].',
      );
    }

    const dailyBudget = Number(config.dailyBudget);
    if (!Number.isFinite(dailyBudget) || dailyBudget < 1) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires dailyBudget >= 1.',
      );
    }

    const language =
      typeof config.language === 'string' && config.language.trim()
        ? config.language.trim()
        : 'en';

    const marketingGoal = config.marketingGoal as MarketingGoal | undefined;
    if (!marketingGoal || !Object.values(MarketingGoal).includes(marketingGoal)) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires a valid marketingGoal.',
      );
    }

    const adAccountIds = asRecord(config.adAccountIds);
    if (!adAccountIds) {
      throw new BadRequestException(
        'GENERATE_CAMPAIGN requires adAccountIds.',
      );
    }

    const preferences = asRecord(config.preferences);

    return {
      productId: productId.trim(),
      countries: countries.map(String),
      platforms: platforms as PlatformType[],
      dailyBudget,
      language,
      marketingGoal,
      adAccountIds: {
        META:
          typeof adAccountIds.META === 'string'
            ? adAccountIds.META
            : undefined,
        TIKTOK:
          typeof adAccountIds.TIKTOK === 'string'
            ? adAccountIds.TIKTOK
            : undefined,
      },
      currency:
        typeof config.currency === 'string'
          ? (config.currency as Currency)
          : undefined,
      preferences: preferences
        ? {
            campaignNamePrefix:
              typeof preferences.campaignNamePrefix === 'string'
                ? preferences.campaignNamePrefix
                : undefined,
            callToAction:
              typeof preferences.callToAction === 'string'
                ? (preferences.callToAction as CallToAction)
                : undefined,
            creativeType:
              typeof preferences.creativeType === 'string'
                ? (preferences.creativeType as CreativeType)
                : undefined,
          }
        : undefined,
    };
  }
}
