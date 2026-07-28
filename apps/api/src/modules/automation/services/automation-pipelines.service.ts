import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  AutomationPipeline,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import { CreateAutomationPipelineDto } from '../dto/create-automation-pipeline.dto';
import { UpdateAutomationPipelineDto } from '../dto/update-automation-pipeline.dto';
import { AutomationPipelineQueryDto } from '../dto/automation-pipeline-query.dto';
import { AutomationPipelineResponseDto } from '../dto/automation-pipeline-response.dto';
import { AutomationMapper } from '../mappers/automation.mapper';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import {
  AUTOMATION_PIPELINE_SORT_FIELDS,
  AutomationPipelineSortField,
} from '../constants/automation.constants';

@Injectable()
export class AutomationPipelinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mapper: AutomationMapper,
    private readonly actionRegistry: AutomationActionRegistry,
  ) {}

  async create(
    dto: CreateAutomationPipelineDto,
    currentUser: JwtPayload,
  ): Promise<AutomationPipelineResponseDto> {
    this.actionRegistry.assertSupportedActions(dto.actions);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const pipeline = await tx.automationPipeline.create({
          data: {
            organizationId: currentUser.organizationId,
            createdByUserId: currentUser.sub,
            name: dto.name,
            description: dto.description,
            triggerType: dto.triggerType,
            triggerConfig:
              dto.triggerConfig as Prisma.InputJsonValue,
            actions:
              dto.actions as unknown as Prisma.InputJsonValue,
            isEnabled: dto.isEnabled ?? true,
          },
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action:
              AuditAction.AUTOMATION_PIPELINE_CREATED,
            entity: AuditEntity.AUTOMATION,
            entityId: pipeline.id,
            metadata: {
              name: pipeline.name,
              triggerType: pipeline.triggerType,
            },
          },
          tx,
        );

        return this.mapper.toPipelineResponse(pipeline);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(
    query: AutomationPipelineQueryDto,
    currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<AutomationPipelineResponseDto>
  > {
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

    const [pipelines, total] =
      await this.prisma.$transaction([
        this.prisma.automationPipeline.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortField]: query.sortOrder,
          },
        }),
        this.prisma.automationPipeline.count({
          where,
        }),
      ]);

    return {
      data: this.mapper.toPipelineResponses(pipelines),
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
  ): Promise<AutomationPipelineResponseDto> {
    const pipeline = await this.getPipelineOrThrow(
      id,
      currentUser.organizationId,
    );

    return this.mapper.toPipelineResponse(pipeline);
  }

  async update(
    id: string,
    dto: UpdateAutomationPipelineDto,
    currentUser: JwtPayload,
  ): Promise<AutomationPipelineResponseDto> {
    if (dto.actions?.length) {
      this.actionRegistry.assertSupportedActions(dto.actions);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await this.getPipelineOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        if (
          dto.version !== undefined &&
          existing.version !== dto.version
        ) {
          throw new ConflictException(
            'Automation pipeline has been modified by another request.',
          );
        }

        const pipeline =
          await tx.automationPipeline.update({
            where: {
              id,
            },
            data: {
              name: dto.name,
              description: dto.description,
              triggerType: dto.triggerType,
              triggerConfig:
                dto.triggerConfig as
                  | Prisma.InputJsonValue
                  | undefined,
              actions: dto.actions
                ? (dto.actions as unknown as Prisma.InputJsonValue)
                : undefined,
              isEnabled: dto.isEnabled,
              version: {
                increment: 1,
              },
            },
          });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action:
              AuditAction.AUTOMATION_PIPELINE_UPDATED,
            entity: AuditEntity.AUTOMATION,
            entityId: pipeline.id,
            metadata: {
              name: pipeline.name,
              triggerType: pipeline.triggerType,
            },
          },
          tx,
        );

        return this.mapper.toPipelineResponse(pipeline);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const pipeline = await this.getPipelineOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        await tx.automationPipeline.update({
          where: {
            id,
          },
          data: {
            deletedAt: new Date(),
            isEnabled: false,
            version: {
              increment: 1,
            },
          },
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action:
              AuditAction.AUTOMATION_PIPELINE_DELETED,
            entity: AuditEntity.AUTOMATION,
            entityId: pipeline.id,
            metadata: {
              name: pipeline.name,
              triggerType: pipeline.triggerType,
            },
          },
          tx,
        );
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getEnabledPipelineOrThrow(
    id: string,
    organizationId: string,
    triggerType?: AutomationPipeline['triggerType'],
  ): Promise<AutomationPipeline> {
    const pipeline =
      await this.prisma.automationPipeline.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
          isEnabled: true,
          ...(triggerType ? { triggerType } : {}),
        },
      });

    if (!pipeline) {
      throw new NotFoundException(
        'Enabled automation pipeline not found.',
      );
    }

    return pipeline;
  }

  private async getPipelineOrThrow(
    id: string,
    organizationId: string,
    tx: Prisma.TransactionClient | PrismaService =
      this.prisma,
  ): Promise<AutomationPipeline> {
    const pipeline =
      await tx.automationPipeline.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

    if (!pipeline) {
      throw new NotFoundException(
        'Automation pipeline not found.',
      );
    }

    return pipeline;
  }

  private buildWhereClause(
    query: AutomationPipelineQueryDto,
    currentUser: JwtPayload,
  ): Prisma.AutomationPipelineWhereInput {
    const where: Prisma.AutomationPipelineWhereInput = {
      organizationId: currentUser.organizationId,
      deletedAt: null,
    };

    if (query.triggerType) {
      where.triggerType = query.triggerType;
    }

    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private ensureValidSortField(
    field: string,
  ): AutomationPipelineSortField {
    if (
      AUTOMATION_PIPELINE_SORT_FIELDS.includes(
        field as AutomationPipelineSortField,
      )
    ) {
      return field as AutomationPipelineSortField;
    }

    throw new BadRequestException(
      `Invalid sort field: ${field}`,
    );
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof PrismaClientKnownRequestError
    ) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'Automation pipeline already exists.',
          );

        case 'P2025':
          throw new NotFoundException(
            'Automation pipeline not found.',
          );
      }
    }

    throw error;
  }
}
