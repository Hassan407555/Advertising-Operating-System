import { Injectable, OnModuleInit } from '@nestjs/common';

import { PromptRegistry } from '../../ai/prompts/prompt.registry';
import { MARKETING_COPY_PROMPT_TEMPLATE } from './marketing-copy.template';

@Injectable()
export class AiCopyPromptRegistrar implements OnModuleInit {
  constructor(private readonly promptRegistry: PromptRegistry) {}

  onModuleInit(): void {
    this.promptRegistry.register(MARKETING_COPY_PROMPT_TEMPLATE);
  }
}
