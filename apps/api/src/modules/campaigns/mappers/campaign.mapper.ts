import { Injectable } from '@nestjs/common';

import {
  CAMPAIGN_INCLUDE,
  CampaignWithRelations,
} from '../constants/campaign.constants';
import { CampaignResponseDto } from '../dto/campaign-response.dto';

@Injectable()
export class CampaignMapper {
  toResponse(campaign: CampaignWithRelations): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      adAccountId: campaign.adAccountId,

      externalId: campaign.externalId,
      externalName: campaign.externalName,
      externalStatus: campaign.externalStatus,

      name: campaign.name,
      slug: campaign.slug,

      objective: campaign.objective,
      buyingType: campaign.buyingType,
      status: campaign.status,

      isActive: campaign.isActive,
      currency: campaign.currency,

      dailyBudget: campaign.dailyBudget?.toString() ?? null,
      lifetimeBudget: campaign.lifetimeBudget?.toString() ?? null,

      startDate: campaign.startDate,
      endDate: campaign.endDate,

      version: campaign.version,

      archivedAt: campaign.archivedAt,
      deletedAt: campaign.deletedAt,

      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,

      organization: campaign.organization
        ? {
            id: campaign.organization.id,
            name: campaign.organization.name,
          }
        : undefined,

      adAccount: campaign.adAccount
        ? {
            id: campaign.adAccount.id,
            accountName: campaign.adAccount.accountName,
            platform: campaign.adAccount.platform,
            externalId: campaign.adAccount.externalId,
            currency: campaign.adAccount.currency,
            timezone: campaign.adAccount.timezone,
            isActive: campaign.adAccount.isActive,
          }
        : undefined,
    };
  }
}