import {
  Controller,
  Get,
  Param,
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

import {
  CampaignSyncStatusDto,
  SyncResultDto,
} from '../dto/synchronization-response.dto';
import { SynchronizationMapper } from '../mappers/synchronization.mapper';
import { SynchronizationService } from '../services/synchronization.service';

@ApiTags('Synchronization')
@ApiBearerAuth()
@Controller('synchronization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SynchronizationController {
  constructor(
    private readonly synchronizationService: SynchronizationService,
    private readonly mapper: SynchronizationMapper,
  ) {}

  @Post('campaign/:id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({
    summary:
      'Pull latest campaign graph state and metrics from the advertising platform',
  })
  @ApiResponse({ status: 201, type: SyncResultDto })
  async syncCampaign(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SyncResultDto> {
    const result = await this.synchronizationService.syncCampaign(
      id,
      currentUser,
    );
    return this.mapper.toSyncResponse(result);
  }

  @Post('account/:id')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({
    summary: 'Synchronize all campaigns for an ad account',
  })
  @ApiResponse({ status: 201, type: SyncResultDto })
  async syncAccount(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SyncResultDto> {
    const result = await this.synchronizationService.syncAccount(
      id,
      currentUser,
    );
    return this.mapper.toSyncResponse(result);
  }

  @Get('status/:campaignId')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER)
  @ApiOperation({
    summary: 'Read last known sync status and metrics for a campaign graph',
  })
  @ApiResponse({ status: 200, type: CampaignSyncStatusDto })
  getStatus(
    @Param('campaignId') campaignId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CampaignSyncStatusDto> {
    return this.synchronizationService.getCampaignSyncStatus(
      campaignId,
      currentUser,
    );
  }
}
