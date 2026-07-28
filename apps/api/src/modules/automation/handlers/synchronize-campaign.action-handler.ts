import { Injectable, OnModuleInit } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';

import { SynchronizationService } from '../../synchronization/services/synchronization.service';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import type {
  AutomationActionContext,
  AutomationActionDefinition,
  AutomationActionHandler,
  AutomationActionResult,
} from '../interfaces/automation-action-handler.interface';
import { resolveCampaignIds } from '../utils/automation-config.util';

@Injectable()
export class SynchronizeCampaignActionHandler
  implements AutomationActionHandler, OnModuleInit
{
  readonly type = AutomationActionType.SYNCHRONIZE_CAMPAIGN;

  constructor(
    private readonly registry: AutomationActionRegistry,
    private readonly synchronizationService: SynchronizationService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(
    definition: AutomationActionDefinition,
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const campaignIds = resolveCampaignIds(context, definition.config);
    const syncResults: Awaited<
      ReturnType<SynchronizationService['syncCampaign']>
    >[] = [];

    for (const campaignId of campaignIds) {
      const result = await this.synchronizationService.syncCampaign(
        campaignId,
        context.currentUser,
      );
      syncResults.push(result);
    }

    return {
      output: {
        campaignIds,
        syncResults,
      },
    };
  }
}
