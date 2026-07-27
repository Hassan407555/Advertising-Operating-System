import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  AutomationPipeline,
  AutomationRun,
  AutomationRunStatus,
  AutomationStep,
  AutomationStepStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import { AutomationRunQueryDto } from '../dto/automation-run-query.dto';
import { AutomationRunResponseDto } from '../dto/automation-run-response.dto';
import { AutomationMapper } from '../mappers/automation.mapper';
import {
  AUTOMATION_RUN_SORT_FIELDS,
  AutomationRunSortField,
} from '../constants/automation.constants';
import { AutomationActionDefinition } from '../interfaces/automation-action-handler.interface';

type AutomationRunWithSteps = AutomationRun & {
  steps: AutomationStep[];
};

@Injectable()
export class AutomationRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mapper: AutomationMapper,
  ) {}

  async createRun(
    pipeline: AutomationPipeline,
    currentUser: JwtPayload,
    metadata?: Record<string, unknown>,
  ): Promise<AutomationRunWithSteps> {
    if (pipeline.organizationId !== currentUser.organizationId) {
      throw new NotFoundException(
        'Automation pipeline not found.',
      );
    }

    const actions =
      pipeline.actions as unknown as AutomationActionDefinition[];

    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException(
        'Automation pipeline has no actions to execute.',
      );
    }

    for (const action of actions) {
      if (!action?.type) {
        throw new BadRequestException(
          'Automation action definition is invalid.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.automationRun.create({
        data: {
          organizationId: currentUser.organizationId,
          pipelineId: pipeline.id,
          triggerType: pipeline.triggerType,
          triggeredByUserId: currentUser.sub,
          metadata: metadata as
            | Prisma.InputJsonValue
            | undefined,
          steps: {
            create: actions.map((action, index) => ({
              organizationId: currentUser.organizationId,
              actionType: action.type,
              stepOrder: index + 1,
              input:
                action as unknown as Prisma.InputJsonValue,
            })),
          },
        },
        include: {
          steps: {
            orderBy: {
              stepOrder: 'asc',
            },
          },
        },
      });
    });
  }

  async findAll(
    query: AutomationRunQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AutomationRunResponseDto>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const sortField = this.ensureValidSortField(
      query.sortBy,
    );
    const where = this.buildWhereClause(
      query,
      currentUser,
    );

    const [runs, total] = await this.prisma.$transaction([
      this.prisma.automationRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortField]: query.sortOrder,
        },
        include: {
          steps: {
            orderBy: {
              stepOrder: 'asc',
            },
          },
        },
      }),
      this.prisma.automationRun.count({
        where,
      }),
    ]);

    return {
      data: this.mapper.toRunResponses(runs),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    const run = await this.getRunOrThrow(
      id,
      currentUser.organizationId,
    );

    return this.mapper.toRunResponse(run);
  }

  async markRunRunning(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const run = await this.updateRunStatus(
        id,
        currentUser.organizationId,
        AutomationRunStatus.RUNNING,
        {
          startedAt: new Date(),
        },
        tx,
      );

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AUTOMATION_RUN_STARTED,
          entity: AuditEntity.AUTOMATION,
          entityId: run.id,
          metadata: {
            pipelineId: run.pipelineId,
            triggerType: run.triggerType,
          },
        },
        tx,
      );
    });
  }

  async markRunCompleted(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const run = await this.updateRunStatus(
        id,
        currentUser.organizationId,
        AutomationRunStatus.COMPLETED,
        {
          completedAt: new Date(),
        },
        tx,
      );

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AUTOMATION_RUN_COMPLETED,
          entity: AuditEntity.AUTOMATION,
          entityId: run.id,
          metadata: {
            pipelineId: run.pipelineId,
          },
        },
        tx,
      );
    });
  }

  async markRunFailed(
    id: string,
    currentUser: JwtPayload,
    errorMessage: string,
  ): Promise<void> {
    const safeErrorMessage =
      this.truncateErrorMessage(errorMessage);

    await this.prisma.$transaction(async (tx) => {
      const run = await this.updateRunStatus(
        id,
        currentUser.organizationId,
        AutomationRunStatus.FAILED,
        {
          completedAt: new Date(),
          errorMessage: safeErrorMessage,
        },
        tx,
      );

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AUTOMATION_RUN_FAILED,
          entity: AuditEntity.AUTOMATION,
          entityId: run.id,
          metadata: {
            pipelineId: run.pipelineId,
            errorMessage: safeErrorMessage,
          },
        },
        tx,
      );
    });
  }

  async markStepRunning(
    id: string,
    organizationId: string,
  ): Promise<void> {
    await this.updateStepStatus(
      id,
      organizationId,
      AutomationStepStatus.RUNNING,
      {
        startedAt: new Date(),
      },
    );
  }

  async markStepCompleted(
    id: string,
    organizationId: string,
    output?: Record<string, unknown>,
  ): Promise<void> {
    await this.updateStepStatus(
      id,
      organizationId,
      AutomationStepStatus.COMPLETED,
      {
        completedAt: new Date(),
        output: output as
          | Prisma.InputJsonValue
          | undefined,
      },
    );
  }

  async markStepFailed(
    id: string,
    organizationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updateStepStatus(
      id,
      organizationId,
      AutomationStepStatus.FAILED,
      {
        completedAt: new Date(),
        errorMessage: this.truncateErrorMessage(errorMessage),
      },
    );
  }

  async skipRemainingSteps(
    runId: string,
    organizationId: string,
    failedStepOrder: number,
  ): Promise<void> {
    await this.prisma.automationStep.updateMany({
      where: {
        runId,
        organizationId,
        stepOrder: {
          gt: failedStepOrder,
        },
        status: AutomationStepStatus.PENDING,
      },
      data: {
        status: AutomationStepStatus.SKIPPED,
        completedAt: new Date(),
      },
    });
  }

  async getRunOrThrow(
    id: string,
    organizationId: string,
  ): Promise<AutomationRunWithSteps> {
    const run = await this.prisma.automationRun.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        steps: {
          orderBy: {
            stepOrder: 'asc',
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(
        'Automation run not found.',
      );
    }

    return run;
  }

  private async updateRunStatus(
    id: string,
    organizationId: string,
    status: AutomationRunStatus,
    data: Omit<
      Prisma.AutomationRunUpdateInput,
      'status'
    > = {},
    tx: Prisma.TransactionClient | PrismaService =
      this.prisma,
  ): Promise<AutomationRun> {
    const result = await tx.automationRun.updateMany({
      where: {
        id,
        organizationId,
      },
      data: {
        ...data,
        status,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'Automation run not found.',
      );
    }

    return tx.automationRun.findUniqueOrThrow({
      where: {
        id,
      },
    });
  }

  private async updateStepStatus(
    id: string,
    organizationId: string,
    status: AutomationStepStatus,
    data: Omit<
      Prisma.AutomationStepUpdateInput,
      'status'
    > = {},
  ): Promise<void> {
    const result =
      await this.prisma.automationStep.updateMany({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          status,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Automation step not found.',
      );
    }
  }

  private buildWhereClause(
    query: AutomationRunQueryDto,
    currentUser: JwtPayload,
  ): Prisma.AutomationRunWhereInput {
    return {
      organizationId: currentUser.organizationId,
      ...(query.pipelineId && {
        pipelineId: query.pipelineId,
      }),
      ...(query.status && {
        status: query.status,
      }),
      ...(query.triggerType && {
        triggerType: query.triggerType,
      }),
    };
  }

  private ensureValidSortField(
    field: string,
  ): AutomationRunSortField {
    if (
      AUTOMATION_RUN_SORT_FIELDS.includes(
        field as AutomationRunSortField,
      )
    ) {
      return field as AutomationRunSortField;
    }

    throw new BadRequestException(
      `Invalid sort field: ${field}`,
    );
  }

  private truncateErrorMessage(message: string): string {
    return message.length > 1000
      ? message.slice(0, 1000)
      : message;
  }
}
