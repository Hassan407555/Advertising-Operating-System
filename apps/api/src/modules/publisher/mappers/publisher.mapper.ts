import { Injectable } from '@nestjs/common';

import { PUBLISHER_ROADMAP_PLATFORMS } from '../constants/publisher.constants';
import {
  PublishCampaignResponseDto,
  PublisherPlatformsResponseDto,
  PublishValidationResponseDto,
} from '../dto/publish-campaign-response.dto';
import { PublisherPlatform } from '../enums/publisher.enums';
import type {
  PublishResult,
  PublishValidationResult,
} from '../providers/interfaces/publisher-provider.interface';

@Injectable()
export class PublisherMapper {
  toValidationResponse(
    result: PublishValidationResult,
  ): PublishValidationResponseDto {
    return {
      valid: result.valid,
      platform: result.platform,
      issues: result.issues,
    };
  }

  toPublishResponse(result: PublishResult): PublishCampaignResponseDto {
    return {
      success: result.success,
      platform: result.platform,
      status: result.status,
      campaignId: result.campaignId,
      externalCampaignId: result.externalCampaignId,
      entities: result.entities,
      issues: result.issues,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
    };
  }

  toPlatformsResponse(
    registered: PublisherPlatform[],
  ): PublisherPlatformsResponseDto {
    return {
      registered,
      roadmap: [...PUBLISHER_ROADMAP_PLATFORMS],
    };
  }
}
