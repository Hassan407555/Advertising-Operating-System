import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsBreakdownDto } from '../dto/analytics-breakdown.dto';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve analytics snapshots',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully.',
  })
  findAll(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '================ ANALYTICS FIND ALL ================',
    );
    console.log('Query:', query);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.findAll(
      query,
      currentUser,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Analytics dashboard',
  })
  @ApiResponse({
    status: 200,
    description:
      'Analytics dashboard retrieved successfully.',
  })
  getDashboard(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '=============== ANALYTICS DASHBOARD ================',
    );
    console.log('Query:', query);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.getDashboard(
      query,
      currentUser,
    );
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Analytics summary',
  })
  getSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '================ ANALYTICS SUMMARY =================',
    );
    console.log('Query:', query);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.getSummary(
      query,
      currentUser,
    );
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Analytics time series',
  })
  getTimeSeries(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '=============== ANALYTICS TIMESERIES ===============',
    );
    console.log('Query:', query);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.getTimeSeries(
      query,
      currentUser,
    );
  }

  @Get('breakdown')
  @ApiOperation({
    summary: 'Analytics breakdown',
  })
  getBreakdown(
    @Query() query: AnalyticsBreakdownDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '=============== ANALYTICS BREAKDOWN ================',
    );
    console.log('Query:', query);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.getBreakdown(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve analytics snapshot',
  })
  @ApiResponse({
    status: 200,
    type: AnalyticsResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    console.log(
      '=============== ANALYTICS FIND ONE =================',
    );
    console.log('Analytics ID:', id);
    console.log('Current User:', currentUser);
    console.log(
      '====================================================',
    );

    return this.analyticsService.findOne(
      id,
      currentUser,
    );
  }
}