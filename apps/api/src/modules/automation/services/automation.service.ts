import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  AutomationActionType,
  AutomationTriggerType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AutomationRunResponseDto } from '../dto/automation-run-response.dto';
import {
  RunActionDto,
  RunCampaignWorkflowDto,
  RunFullWorkflowDto,
  RunPublishWorkflowDto,
  RunSynchronizationWorkflowDto,
} from '../dto/automation-workflow.dto';
import type { AutomationActionDefinition } from '../interfaces/automation-action-handler.interface';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import { AutomationExecutorService } from './automation-executor.service';
import { AutomationRunService } from './automation-run.service';

const SYSTEM_PIPELINE_NAMES = {
  campaign: '[System] Campaign Workflow',
  publish: '[System] Publish Workflow',
  sync: '[System] Synchronization Workflow',
  full: '[System] Full Workflow',
  action: '[System] Single Action Workflow',
} as const;

/**
 * High-level workflow orchestration facade.
 * Reuses AutomationExecutorService + registered action handlers only.
 */
@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executorService: AutomationExecutorService,
    private readonly runService: AutomationRunService,
    private readonly actionRegistry: AutomationActionRegistry,
  ) {}

  async runWorkflow(
    actions: AutomationActionDefinition[],
    metadata: Record<string, unknown> | undefined,
    currentUser: JwtPayload,
    pipelineName: string = SYSTEM_PIPELINE_NAMES.action,
  ): Promise<AutomationRunResponseDto> {
    if (!actions.length) {
      throw new BadRequestException('Workflow requires at least one action.');
    }

    this.actionRegistry.assertSupportedActions(actions);

    const pipeline = await this.getOrCreateSystemPipeline(
      currentUser,
      pipelineName,
      actions,
    );

    return this.executorService.executePipeline(
      pipeline,
      currentUser,
      metadata,
    );
  }

  async runAction(
    dto: RunActionDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    const type = dto.type as AutomationActionType;
    if (!Object.values(AutomationActionType).includes(type)) {
      throw new BadRequestException(`Unsupported automation action: ${dto.type}`);
    }

    this.actionRegistry.assertSupportedActions([{ type }]);

    return this.runWorkflow(
      [{ type, config: dto.config }],
      {
        ...(dto.metadata ?? {}),
        ...(dto.config ?? {}),
      },
      currentUser,
      `${SYSTEM_PIPELINE_NAMES.action}: ${type}`,
    );
  }

  async runCampaignWorkflow(
    dto: RunCampaignWorkflowDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    return this.runWorkflow(
      [
        { type: AutomationActionType.GENERATE_CAMPAIGN },
        { type: AutomationActionType.GENERATE_AI_COPY },
      ],
      { ...dto },
      currentUser,
      SYSTEM_PIPELINE_NAMES.campaign,
    );
  }

  async runPublishWorkflow(
    dto: RunPublishWorkflowDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    const campaignIds = this.normalizeCampaignIds(dto.campaignId, dto.campaignIds);

    return this.runWorkflow(
      [
        { type: AutomationActionType.PUBLISH_CAMPAIGN },
        { type: AutomationActionType.SYNCHRONIZE_CAMPAIGN },
      ],
      {
        ...dto,
        campaignIds,
        campaignId: campaignIds[0],
      },
      currentUser,
      SYSTEM_PIPELINE_NAMES.publish,
    );
  }

  async runSynchronizationWorkflow(
    dto: RunSynchronizationWorkflowDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    const campaignIds = this.normalizeCampaignIds(dto.campaignId, dto.campaignIds);

    return this.runWorkflow(
      [{ type: AutomationActionType.SYNCHRONIZE_CAMPAIGN }],
      {
        campaignIds,
        campaignId: campaignIds[0],
      },
      currentUser,
      SYSTEM_PIPELINE_NAMES.sync,
    );
  }

  async runFullWorkflow(
    dto: RunFullWorkflowDto,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    return this.runWorkflow(
      [
        { type: AutomationActionType.GENERATE_CAMPAIGN },
        { type: AutomationActionType.GENERATE_AI_COPY },
        { type: AutomationActionType.PUBLISH_CAMPAIGN },
        { type: AutomationActionType.SYNCHRONIZE_CAMPAIGN },
      ],
      { ...dto },
      currentUser,
      SYSTEM_PIPELINE_NAMES.full,
    );
  }

  getWorkflow(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AutomationRunResponseDto> {
    return this.runService.findOne(id, currentUser);
  }

  private normalizeCampaignIds(
    campaignId?: string,
    campaignIds?: string[],
  ): string[] {
    const ids = [
      ...(campaignIds ?? []),
      ...(campaignId ? [campaignId] : []),
    ].filter((id, index, arr) => arr.indexOf(id) === index);

    if (ids.length === 0) {
      throw new BadRequestException(
        'Provide campaignId or campaignIds for this workflow.',
      );
    }

    return ids;
  }

  private async getOrCreateSystemPipeline(
    currentUser: JwtPayload,
    name: string,
    actions: AutomationActionDefinition[],
  ) {
    const existing = await this.prisma.automationPipeline.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        name,
        deletedAt: null,
      },
    });

    const actionsJson = actions as unknown as Prisma.InputJsonValue;

    if (existing) {
      return this.prisma.automationPipeline.update({
        where: { id: existing.id },
        data: {
          actions: actionsJson,
          isEnabled: true,
          description: 'System-managed automation workflow pipeline.',
        },
      });
    }

    return this.prisma.automationPipeline.create({
      data: {
        organizationId: currentUser.organizationId,
        createdByUserId: currentUser.sub,
        name,
        description: 'System-managed automation workflow pipeline.',
        triggerType: AutomationTriggerType.MANUAL_LAUNCH,
        actions: actionsJson,
        isEnabled: true,
      },
    });
  }
}
