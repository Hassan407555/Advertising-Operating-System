import { Injectable } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { TriggerAutomationDto } from '../dto/trigger-automation.dto';
import { AutomationRunResponseDto } from '../dto/automation-run-response.dto';
import { AutomationExecutorService } from './automation-executor.service';
import { AutomationPipelinesService } from './automation-pipelines.service';

@Injectable()
export class AutomationTriggerService {
  constructor(
    private readonly pipelinesService: AutomationPipelinesService,
    private readonly executorService: AutomationExecutorService,
  ) {}

  async triggerManualLaunch(
    pipelineId: string,
    dto: TriggerAutomationDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    const pipeline =
      await this.pipelinesService.getEnabledPipelineOrThrow(
        pipelineId,
        currentUser.organizationId,
        AutomationTriggerType.MANUAL_LAUNCH,
      );

    return this.executorService.executePipeline(
      pipeline,
      currentUser,
      dto.metadata,
    );
  }
}
