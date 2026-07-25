import { Injectable } from '@nestjs/common';

import {
  AdSetWithRelations,
} from '../constants/ad-set.constants';

import { AdSetResponseDto } from '../dto/ad-set-response.dto';

@Injectable()
export class AdSetMapper {
  toResponse(
    adSet: AdSetWithRelations,
  ): AdSetResponseDto {
    return {
      id: adSet.id,
      organizationId: adSet.organizationId,
      campaignId: adSet.campaignId,

      name: adSet.name,

      status: adSet.status,

      dailyBudget: adSet.dailyBudget?.toString() ?? null,

      lifetimeBudget:
        adSet.lifetimeBudget?.toString() ?? null,

      bidAmount:
        adSet.bidAmount?.toString() ?? null,

      billingEvent: adSet.billingEvent,

      targeting: adSet.targeting,

      metadata: adSet.metadata,

      tags: adSet.tags,

      isActive: adSet.isActive,

      startDate: adSet.startDate,

      endDate: adSet.endDate,

      version: adSet.version,

      createdAt: adSet.createdAt,

      updatedAt: adSet.updatedAt,

      organization: {
        id: adSet.organization.id,
        name: adSet.organization.name,
      },

      campaign: {
        id: adSet.campaign.id,
        name: adSet.campaign.name,
      },
    };
  }
}