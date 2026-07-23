import { AdSetWithRelations } from '../constants/ad-set.constants';
import { Injectable } from '@nestjs/common';
import { AdSetResponseDto } from '../dto/ad-set-response.dto';

@Injectable()
export class AdSetMapper {
  toResponse(adSet: AdSetWithRelations): AdSetResponseDto {
    return {
      id: adSet.id,
      organizationId: adSet.organizationId,
      campaignId: adSet.campaignId,

      name: adSet.name,

      status: adSet.status,

      dailyBudget: adSet.dailyBudget
        ? adSet.dailyBudget.toString()
        : null,

      lifetimeBudget: adSet.lifetimeBudget
        ? adSet.lifetimeBudget.toString()
        : null,

      bidAmount: adSet.bidAmount
        ? adSet.bidAmount.toString()
        : null,

      billingEvent: adSet.billingEvent,

      targeting: adSet.targeting,

      isActive: adSet.isActive,

      startDate: adSet.startDate,
      endDate: adSet.endDate,

      version: adSet.version,

      createdAt: adSet.createdAt,
      updatedAt: adSet.updatedAt,

      organization: adSet.organization
        ? {
            id: adSet.organization.id,
            name: adSet.organization.name,
          }
        : undefined,

      campaign: adSet.campaign
        ? {
            id: adSet.campaign.id,
            name: adSet.campaign.name,
          }
        : undefined,
    };
  }
}