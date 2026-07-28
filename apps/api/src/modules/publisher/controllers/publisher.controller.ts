import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { PublishCampaignDto } from '../dto/publish-campaign.dto';
import {
  PublishCampaignResponseDto,
  PublisherPlatformsResponseDto,
  PublishValidationResponseDto,
} from '../dto/publish-campaign-response.dto';
import { PublisherService } from '../services/publisher.service';

@ApiTags('Publisher')
@ApiBearerAuth()
@Controller('publisher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Get('platforms')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({
    summary: 'List registered publisher providers and roadmap platforms',
  })
  @ApiResponse({
    status: 200,
    type: PublisherPlatformsResponseDto,
  })
  listPlatforms(): PublisherPlatformsResponseDto {
    return this.publisherService.listPlatforms();
  }

  @Post('validate')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({
    summary:
      'Validate a publish request via the registered provider (no platform mutations)',
  })
  @ApiResponse({
    status: 201,
    type: PublishValidationResponseDto,
  })
  validate(
    @Body() dto: PublishCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PublishValidationResponseDto> {
    return this.publisherService.validate(dto, currentUser);
  }

  @Post('publish')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary:
      'Publish a campaign via the registered provider for the selected platform',
  })
  @ApiResponse({
    status: 201,
    type: PublishCampaignResponseDto,
  })
  publish(
    @Body() dto: PublishCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PublishCampaignResponseDto> {
    return this.publisherService.publish(dto, currentUser);
  }
}
