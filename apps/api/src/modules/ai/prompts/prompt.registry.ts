import { Injectable, OnModuleInit } from '@nestjs/common';

import { PromptTemplate } from '../interfaces/prompt.interfaces';
import { GENERIC_PROMPT_TEMPLATES } from './templates/generic.templates';

@Injectable()
export class PromptRegistry implements OnModuleInit {
  private readonly templates = new Map<string, PromptTemplate>();

  onModuleInit(): void {
    for (const template of GENERIC_PROMPT_TEMPLATES) {
      this.register(template);
    }
  }

  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  get(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  list(): PromptTemplate[] {
    return [...this.templates.values()];
  }
}
