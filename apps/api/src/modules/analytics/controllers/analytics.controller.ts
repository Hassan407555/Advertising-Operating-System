import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AnalyticsBreakdownDto } from '../dto/analytics-breakdown.dto';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';

import { ExportFormat } from '../export/enums/export-format.enum';
import { AnalyticsExportService } from '../export/analytics-export.service';

import { AnalyticsService } from '../services/analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly analyticsExportService: AnalyticsExportService,
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
    return this.analyticsService.findAll(
      query,
      currentUser,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Analytics dashboard',
  })
  getDashboard(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
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
    return this.analyticsService.getBreakdown(
      query,
      currentUser,
    );
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Export analytics as CSV',
  })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<void> {
    const buffer =
      await this.analyticsExportService.export(
        ExportFormat.CSV,
        query,
        currentUser,
      );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="analytics-report.csv"',
    );

    response.type('text/csv');

    response.send(buffer);
  }

  @Get('export/xlsx')
  @ApiOperation({
    summary: 'Export analytics as Excel',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportExcel(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<void> {
    const buffer =
      await this.analyticsExportService.export(
        ExportFormat.XLSX,
        query,
        currentUser,
      );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="analytics-report.xlsx"',
    );

    response.type(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.send(buffer);
  }

  @Get('export/pdf')
  @ApiOperation({
    summary: 'Export analytics as PDF',
  })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<void> {
    const buffer =
      await this.analyticsExportService.export(
        ExportFormat.PDF,
        query,
        currentUser,
      );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="analytics-report.pdf"',
    );

    response.type('application/pdf');

    response.send(buffer);
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
    return this.analyticsService.findOne(
      id,
      currentUser,
    );
  }
}