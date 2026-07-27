import { Injectable } from '@nestjs/common';
import {
  AutomationPipeline,
  AutomationRun,
  AutomationStep,
} from '@prisma/client';

import { AutomationPipelineResponseDto } from '../dto/automation-pipeline-response.dto';
import {
  AutomationRunResponseDto,
  AutomationStepResponseDto,
} from '../dto/automation-run-response.dto';
import { AutomationActionDefinitionDto } from '../dto/automation-action-definition.dto';

type AutomationRunWithSteps = AutomationRun & {
  steps: AutomationStep[];
};

@Injectable()
export class AutomationMapper {
  toPipelineResponse(
    pipeline: AutomationPipeline,
  ): AutomationPipelineResponseDto {
    return {
      id: pipeline.id,
      organizationId: pipeline.organizationId,
      createdByUserId: pipeline.createdByUserId,
      name: pipeline.name,
      description: pipeline.description,
      triggerType: pipeline.triggerType,
      triggerConfig:
        (pipeline.triggerConfig as Record<string, unknown>) ??
        null,
      actions:
        (pipeline.actions as unknown as AutomationActionDefinitionDto[]) ??
        [],
      isEnabled: pipeline.isEnabled,
      version: pipeline.version,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }

  toPipelineResponses(
    pipelines: AutomationPipeline[],
  ): AutomationPipelineResponseDto[] {
    return pipelines.map((pipeline) =>
      this.toPipelineResponse(pipeline),
    );
  }

  toRunResponse(
    run: AutomationRunWithSteps,
  ): AutomationRunResponseDto {
    return {
      id: run.id,
      organizationId: run.organizationId,
      pipelineId: run.pipelineId,
      triggerType: run.triggerType,
      status: run.status,
      triggeredByUserId: run.triggeredByUserId,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage,
      metadata:
        (run.metadata as Record<string, unknown>) ?? null,
      steps: run.steps.map((step) =>
        this.toStepResponse(step),
      ),
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  toRunResponses(
    runs: AutomationRunWithSteps[],
  ): AutomationRunResponseDto[] {
    return runs.map((run) => this.toRunResponse(run));
  }

  toStepResponse(
    step: AutomationStep,
  ): AutomationStepResponseDto {
    return {
      id: step.id,
      organizationId: step.organizationId,
      runId: step.runId,
      actionType: step.actionType,
      stepOrder: step.stepOrder,
      status: step.status,
      input: (step.input as Record<string, unknown>) ?? null,
      output: (step.output as Record<string, unknown>) ?? null,
      errorMessage: step.errorMessage,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    };
  }
}
