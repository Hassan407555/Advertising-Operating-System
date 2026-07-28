import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PUBLISHER_V1_PLATFORMS } from '../constants/publisher.constants';
import { PublishCampaignDto } from '../dto/publish-campaign.dto';
import {
  PublishCampaignResponseDto,
  PublisherPlatformsResponseDto,
  PublishValidationResponseDto,
} from '../dto/publish-campaign-response.dto';
import { PublisherPlatform } from '../enums/publisher.enums';
import { PublisherMapper } from '../mappers/publisher.mapper';
import type { PublishRequest } from '../providers/interfaces/publisher-provider.interface';
import { PublisherRegistry } from '../providers/publisher.registry';

@Injectable()
export class PublisherService {
  constructor(
    private readonly registry: PublisherRegistry,
    private readonly mapper: PublisherMapper,
  ) {}

  /**
   * Returns registered providers and the full publisher roadmap.
   */
  listPlatforms(): PublisherPlatformsResponseDto {
    return this.mapper.toPlatformsResponse(this.registry.listRegistered());
  }

  /**
   * Structural + provider validation. Does not mutate platform state.
   */
  async validate(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): Promise<PublishValidationResponseDto> {
    const request = this.toPublishRequest(dto, currentUser);
    this.assertOrganizationAccess(request.organizationId, currentUser);
    this.assertSupportedPlatform(request.platform);

    const provider = this.registry.get(request.platform);
    const result = await provider.validate(request);

    return this.mapper.toValidationResponse(result);
  }

  /**
   * Routes a publish request to the registered provider for the platform.
   */
  async publish(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): Promise<PublishCampaignResponseDto> {
    const request = this.toPublishRequest(dto, currentUser);
    this.assertOrganizationAccess(request.organizationId, currentUser);
    this.assertSupportedPlatform(request.platform);

    const provider = this.registry.get(request.platform);

    const validation = await provider.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Publish request failed validation.',
        platform: validation.platform,
        issues: validation.issues,
      });
    }

    const result = await provider.publish(request);
    return this.mapper.toPublishResponse(result);
  }

  isPlatformRegistered(platform: PublisherPlatform): boolean {
    return this.registry.has(platform);
  }

  private toPublishRequest(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): PublishRequest {
    return {
      organizationId: dto.organizationId,
      campaignId: dto.campaignId,
      platform: dto.platform,
      adAccountId: dto.adAccountId,
      entityIds: dto.entityIds
        ? {
            adSetIds: dto.entityIds.adSetIds,
            adIds: dto.entityIds.adIds,
            creativeIds: dto.entityIds.creativeIds,
          }
        : undefined,
      options: dto.options,
      requestedByUserId: currentUser.sub,
    };
  }

  private assertOrganizationAccess(
    organizationId: string,
    currentUser: JwtPayload,
  ): void {
    if (organizationId !== currentUser.organizationId) {
      throw new BadRequestException(
        'organizationId does not match the authenticated organization.',
      );
    }
  }

  private assertSupportedPlatform(platform: PublisherPlatform): void {
    if (!PUBLISHER_V1_PLATFORMS.includes(platform)) {
      throw new BadRequestException(
        `Platform ${platform} is not supported in v1. Supported: ${PUBLISHER_V1_PLATFORMS.join(', ')}.`,
      );
    }
  }
}
