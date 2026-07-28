import {
  Controller,
  Get,
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
  AnalyticsSummaryDto,
  AutomationSummaryDto,
  CampaignSummaryDto,
  DashboardSummaryDto,
  PlatformsSummaryDto,
  RecentActivityDto,
} from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({ summary: 'Complete dashboard summary for the active organization' })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  getSummary(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(currentUser);
  }

  @Get('analytics')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({ summary: 'Dashboard analytics summary' })
  @ApiResponse({ status: 200, type: AnalyticsSummaryDto })
  getAnalytics(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AnalyticsSummaryDto> {
    return this.dashboardService.getAnalyticsSummary(currentUser);
  }

  @Get('campaigns')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({ summary: 'Dashboard campaign status summary' })
  @ApiResponse({ status: 200, type: CampaignSummaryDto })
  getCampaigns(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CampaignSummaryDto> {
    return this.dashboardService.getCampaignSummary(currentUser);
  }

  @Get('automation')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({ summary: 'Dashboard automation run summary' })
  @ApiResponse({ status: 200, type: AutomationSummaryDto })
  getAutomation(
    @CurrentUser() _currentUser: JwtPayload,
  ): Promise<AutomationSummaryDto> {
    return this.dashboardService.getAutomationSummary();
  }

  @Get('platforms')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({ summary: 'Dashboard Meta connection and token status' })
  @ApiResponse({ status: 200, type: PlatformsSummaryDto })
  getPlatforms(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformsSummaryDto> {
    return this.dashboardService.getPlatformsSummary(currentUser);
  }

  @Get('recent')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({
    summary: 'Recent campaigns, AI sessions, and stores',
  })
  @ApiResponse({ status: 200, type: RecentActivityDto })
  getRecent(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<RecentActivityDto> {
    return this.dashboardService.getRecentActivity(currentUser);
  }
}
