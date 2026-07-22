import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { CAMPAIGN_INCLUDE } from '../constants/campaign.constants';

type CampaignWithRelations = Prisma.CampaignGetPayload<{
  include: typeof CAMPAIGN_INCLUDE;
}>;

@Injectable()
export class CampaignMapper {
  toResponse(campaign: CampaignWithRelations): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      adAccountId: campaign.adAccountId,

      name: campaign.name,
      slug: campaign.slug,

      objective: campaign.objective,
      buyingType: campaign.buyingType,
      status: campaign.status,

      isActive: campaign.isActive,

      currency: campaign.currency,

      dailyBudget: campaign.dailyBudget
        ? campaign.dailyBudget.toString()
        : null,

      lifetimeBudget: campaign.lifetimeBudget
        ? campaign.lifetimeBudget.toString()
        : null,

      startDate: campaign.startDate,
      endDate: campaign.endDate,

      version: campaign.version,

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