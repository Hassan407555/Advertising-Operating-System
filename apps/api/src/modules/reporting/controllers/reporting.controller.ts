import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportResponseDto } from '../dto/report-response.dto';
import { ReportingService } from '../services/reporting.service';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create report' })
  create(
    @Body() dto: CreateReportDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ReportResponseDto> {
    return this.reportingService.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get reports',
  })
  findAll(
    @Query() query: ReportQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<ReportResponseDto>
  > {
    return this.reportingService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get report',
  })
  @ApiResponse({
    status: 200,
    type: ReportResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ReportResponseDto> {
    return this.reportingService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Update report',
  })
  @ApiResponse({
    status: 200,
    type: ReportResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ReportResponseDto> {
    return this.reportingService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Delete report',
  })
  @ApiResponse({
    status: 204,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.reportingService.remove(
      id,
      currentUser,
    );
  }
}
