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
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportResponseDto } from '../dto/report-response.dto';
import { ReportingService } from '../services/reporting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
  ) {}

  @Post()
create(
  @Body() dto: CreateReportDto,
  @CurrentUser() currentUser: JwtPayload,
): Promise<ReportResponseDto> {
  console.log('Current User:', currentUser);

  return this.reportingService.create(
    dto,
    currentUser,
  );
}

  @Get()
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