import { Injectable } from '@nestjs/common';
import { AutomationPipeline } from '@prisma/client';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AutomationRunResponseDto } from '../dto/automation-run-response.dto';
import { AutomationMapper } from '../mappers/automation.mapper';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import { AutomationRunService } from './automation-run.service';
import { AutomationActionDefinition } from '../interfaces/automation-action-handler.interface';

@Injectable()
export class AutomationExecutorService {
  constructor(
    private readonly runService: AutomationRunService,
    private readonly registry: AutomationActionRegistry,
    private readonly mapper: AutomationMapper,
  ) {}

  async executePipeline(
    pipeline: AutomationPipeline,
    currentUser: JwtPayload,
    metadata?: Record<string, unknown>,
  ): Promise<AutomationRunResponseDto> {
    const run = await this.runService.createRun(
      pipeline,
      currentUser,
      metadata,
    );

    await this.runService.markRunRunning(
      run.id,
      currentUser,
    );

    for (const step of run.steps) {
      await this.runService.markStepRunning(
        step.id,
        currentUser.organizationId,
      );

      const definition =
        step.input as unknown as AutomationActionDefinition;

      try {
        const handler = this.registry.getHandler(
          definition.type,
        );

        const result = await handler.execute(definition, {
          organizationId: currentUser.organizationId,
          pipelineId: pipeline.id,
          runId: run.id,
          stepId: step.id,
          triggeredByUserId: currentUser.sub,
        });

        await this.runService.markStepCompleted(
          step.id,
          currentUser.organizationId,
          result.output,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Automation step failed.';

        await this.runService.markStepFailed(
          step.id,
          currentUser.organizationId,
          errorMessage,
        );

        await this.runService.skipRemainingSteps(
          run.id,
          currentUser.organizationId,
          step.stepOrder,
        );

        await this.runService.markRunFailed(
          run.id,
          currentUser,
          errorMessage,
        );

        const failedRun =
          await this.runService.getRunOrThrow(
            run.id,
            currentUser.organizationId,
          );

        return this.mapper.toRunResponse(failedRun);
      }
    }

    await this.runService.markRunCompleted(
      run.id,
      currentUser,
    );

    const completedRun = await this.runService.getRunOrThrow(
      run.id,
      currentUser.organizationId,
    );

    return this.mapper.toRunResponse(completedRun);
  }
}
