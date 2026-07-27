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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AutomationPipelinesService } from '../services/automation-pipelines.service';
import { AutomationRunService } from '../services/automation-run.service';
import { AutomationTriggerService } from '../services/automation-trigger.service';
import { CreateAutomationPipelineDto } from '../dto/create-automation-pipeline.dto';
import { UpdateAutomationPipelineDto } from '../dto/update-automation-pipeline.dto';
import { AutomationPipelineQueryDto } from '../dto/automation-pipeline-query.dto';
import { TriggerAutomationDto } from '../dto/trigger-automation.dto';
import { AutomationRunQueryDto } from '../dto/automation-run-query.dto';
import { AutomationPipelineResponseDto } from '../dto/automation-pipeline-response.dto';
import { AutomationRunResponseDto } from '../dto/automation-run-response.dto';

@ApiTags('Automation')
@ApiBearerAuth()
@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationController {
  constructor(
    private readonly pipelinesService: AutomationPipelinesService,
    private readonly runService: AutomationRunService,
    private readonly triggerService: AutomationTriggerService,
  ) {}

  @Post('pipelines')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create automation pipeline' })
  @ApiResponse({
    status: 201,
    type: AutomationPipelineResponseDto,
  })
  createPipeline(
    @Body() dto: CreateAutomationPipelineDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AutomationPipelineResponseDto> {
    return this.pipelinesService.create(dto, currentUser);
  }

  @Get('pipelines')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List automation pipelines' })
  findPipelines(
    @Query() query: AutomationPipelineQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<AutomationPipelineResponseDto>
  > {
    return this.pipelinesService.findAll(
      query,
      currentUser,
    );
  }

  @Get('pipelines/:id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get automation pipeline' })
  @ApiResponse({
    status: 200,
    type: AutomationPipelineResponseDto,
  })
  findPipeline(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AutomationPipelineResponseDto> {
    return this.pipelinesService.findOne(
      id,
      currentUser,
    );
  }

  @Patch('pipelines/:id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update automation pipeline' })
  updatePipeline(
    @Param('id') id: string,
    @Body() dto: UpdateAutomationPipelineDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AutomationPipelineResponseDto> {
    return this.pipelinesService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete('pipelines/:id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete automation pipeline' })
  removePipeline(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.pipelinesService.remove(
      id,
      currentUser,
    );
  }

  @Post('pipelines/:id/run')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Manually trigger automation pipeline',
  })
  @ApiResponse({
    status: 201,
    type: AutomationRunResponseDto,
  })
  triggerPipeline(
    @Param('id') id: string,
    @Body() dto: TriggerAutomationDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    return this.triggerService.triggerManualLaunch(
      id,
      dto,
      currentUser,
    );
  }

  @Get('runs')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List automation runs' })
  findRuns(
    @Query() query: AutomationRunQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AutomationRunResponseDto>> {
    return this.runService.findAll(query, currentUser);
  }

  @Get('runs/:id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get automation run' })
  @ApiResponse({
    status: 200,
    type: AutomationRunResponseDto,
  })
  findRun(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    return this.runService.findOne(id, currentUser);
  }
}
