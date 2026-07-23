import { Injectable } from '@nestjs/common';

import { CreativeResponseDto } from '../dto/creative-response.dto';
import { CreativeWithRelations } from '../constants/creative.constants';

@Injectable()
export class CreativeMapper {
  toResponse(
    creative: CreativeWithRelations,
  ): CreativeResponseDto {
    return {
      id: creative.id,
      organizationId: creative.organizationId,

      externalId: creative.externalId ?? undefined,
      externalName: creative.externalName ?? undefined,

      name: creative.name,
      type: creative.type,

      headline: creative.headline ?? undefined,
      primaryText: creative.primaryText ?? undefined,
      description: creative.description ?? undefined,

      callToAction:
        creative.callToAction ?? undefined,

      landingPageUrl:
        creative.landingPageUrl ?? undefined,

      deepLinkUrl:
        creative.deepLinkUrl ?? undefined,

      isActive: creative.isActive,

      archivedAt:
        creative.archivedAt ?? undefined,

      lastSyncedAt:
        creative.lastSyncedAt ?? undefined,

      lastSuccessfulSyncAt:
        creative.lastSuccessfulSyncAt ?? undefined,

      lastFailedSyncAt:
        creative.lastFailedSyncAt ?? undefined,

      metadata:
        (creative.metadata as Record<
          string,
          unknown
        >) ?? undefined,

      tags:
        (creative.tags as string[]) ??
        undefined,

      version: creative.version,

      createdAt: creative.createdAt,
      updatedAt: creative.updatedAt,
    };
  }

  toResponseList(
    creatives: CreativeWithRelations[],
  ): CreativeResponseDto[] {
    return creatives.map((creative) =>
      this.toResponse(creative),
    );
  }
}