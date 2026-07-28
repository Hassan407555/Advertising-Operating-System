import { Injectable, OnModuleInit } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';

import { AiCopyService } from '../../ai-copy/services/ai-copy.service';
import { AutomationActionRegistry } from '../registry/automation-action.registry';
import type {
  AutomationActionContext,
  AutomationActionDefinition,
  AutomationActionHandler,
  AutomationActionResult,
} from '../interfaces/automation-action-handler.interface';
import { resolveCampaignIds } from '../utils/automation-config.util';

@Injectable()
export class GenerateAiCopyActionHandler
  implements AutomationActionHandler, OnModuleInit
{
  readonly type = AutomationActionType.GENERATE_AI_COPY;

  constructor(
    private readonly registry: AutomationActionRegistry,
    private readonly aiCopyService: AiCopyService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(
    definition: AutomationActionDefinition,
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const campaignIds = resolveCampaignIds(context, definition.config);
    const results: Awaited<ReturnType<AiCopyService['generate']>>[] = [];

    for (const campaignId of campaignIds) {
      const result = await this.aiCopyService.generate(
        {
          campaignId,
          organizationId: context.organizationId,
        },
        context.currentUser,
      );
      results.push(result);
    }

    return {
      output: {
        campaignIds,
        aiCopyResults: results,
      },
    };
  }
}
