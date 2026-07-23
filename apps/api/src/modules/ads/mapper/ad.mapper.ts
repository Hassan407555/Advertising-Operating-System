import { Injectable } from '@nestjs/common';

import { AdWithRelations } from '../constants/ad.constants';
import { AdResponseDto } from '../dto/ad-response.dto';

@Injectable()
export class AdMapper {
  toResponse(ad: AdWithRelations): AdResponseDto {
    return {
      id: ad.id,
      organizationId: ad.organizationId,
      adSetId: ad.adSetId,

      creativeId: ad.creativeId,

      name: ad.name,

      status: ad.status,

      isActive: ad.isActive,

      metadata: ad.metadata,

      tags: ad.tags,

      version: ad.version,

      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt,

      organization: ad.organization
        ? {
            id: ad.organization.id,
            name: ad.organization.name,
          }
        : undefined,

      adSet: ad.adSet
        ? {
            id: ad.adSet.id,
            name: ad.adSet.name,
          }
        : undefined,

      creative: ad.creative
        ? {
            id: ad.creative.id,
            name: ad.creative.name,
          }
        : undefined,
    };
  }
}