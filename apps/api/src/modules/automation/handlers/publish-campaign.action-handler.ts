import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { AutomationActionType, PlatformType } from '@prisma/client';

import { PublisherService } from '../../publisher/services/publisher.service';
import { PublisherPlatform } from '../../publisher/enums/publisher.enums';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import type {
  AutomationActionContext,
  AutomationActionDefinition,
  AutomationActionHandler,
  AutomationActionResult,
} from '../interfaces/automation-action-handler.interface';
import {
  asRecord,
  resolveCampaignIds,
} from '../utils/automation-config.util';

@Injectable()
export class PublishCampaignActionHandler
  implements AutomationActionHandler, OnModuleInit
{
  readonly type = AutomationActionType.PUBLISH_CAMPAIGN;

  constructor(
    private readonly registry: AutomationActionRegistry,
    private readonly publisherService: PublisherService,
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

    const campaignIds = resolveCampaignIds(context, definition.config);
    const adAccountIds = asRecord(config.adAccountIds) ?? {};
    const options = asRecord(config.options) ?? asRecord(config.publishOptions);
    const campaignsByPlatform = asRecord(config.campaignsByPlatform) ?? {};

    const publishResults: Awaited<
      ReturnType<PublisherService['publish']>
    >[] = [];

    for (const campaignId of campaignIds) {
      const platform = this.resolvePlatform(
        campaignId,
        config,
        campaignsByPlatform,
      );
      const adAccountId = this.resolveAdAccountId(
        platform,
        adAccountIds,
        config,
      );

      const result = await this.publisherService.publish(
        {
          campaignId,
          organizationId: context.organizationId,
          platform,
          adAccountId,
          options,
        },
        context.currentUser,
      );

      publishResults.push(result);
    }

    return {
      output: {
        campaignIds,
        publishResults,
        publishedCampaignId: campaignIds[0],
      },
    };
  }

  private resolvePlatform(
    campaignId: string,
    config: Record<string, unknown>,
    campaignsByPlatform: Record<string, unknown>,
  ): PublisherPlatform {
    const explicit = config.platform;
    if (explicit === PublisherPlatform.META || explicit === 'META') {
      return PublisherPlatform.META;
    }
    if (explicit === PublisherPlatform.TIKTOK || explicit === 'TIKTOK') {
      return PublisherPlatform.TIKTOK;
    }

    for (const [platform, id] of Object.entries(campaignsByPlatform)) {
      if (id === campaignId) {
        if (platform === PlatformType.META || platform === 'META') {
          return PublisherPlatform.META;
        }
        if (platform === PlatformType.TIKTOK || platform === 'TIKTOK') {
          return PublisherPlatform.TIKTOK;
        }
      }
    }

    const campaigns = config.campaigns;
    if (Array.isArray(campaigns)) {
      const match = campaigns.find(
        (item) =>
          item &&
          typeof item === 'object' &&
          (item as { id?: string }).id === campaignId,
      ) as { platform?: string } | undefined;

      if (match?.platform === 'META') {
        return PublisherPlatform.META;
      }
      if (match?.platform === 'TIKTOK') {
        return PublisherPlatform.TIKTOK;
      }
    }

    throw new BadRequestException(
      `PUBLISH_CAMPAIGN could not resolve platform for campaign ${campaignId}.`,
    );
  }

  private resolveAdAccountId(
    platform: PublisherPlatform,
    adAccountIds: Record<string, unknown>,
    config: Record<string, unknown>,
  ): string {
    const direct = config.adAccountId;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const mapped = adAccountIds[platform];
    if (typeof mapped === 'string' && mapped.trim()) {
      return mapped.trim();
    }

    throw new BadRequestException(
      `PUBLISH_CAMPAIGN requires adAccountId or adAccountIds.${platform}.`,
    );
  }
}
