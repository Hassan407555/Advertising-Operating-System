import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  BuiltPrompt,
  PromptBuildInput,
} from '../interfaces/prompt.interfaces';
import { PromptRegistry } from './prompt.registry';

@Injectable()
export class PromptBuilder {
  constructor(private readonly promptRegistry: PromptRegistry) {}

  build(input: PromptBuildInput): BuiltPrompt {
    const template = this.promptRegistry.get(input.templateId);

    if (!template) {
      throw new NotFoundException(
        `Prompt template not found: ${input.templateId}`,
      );
    }

    const variables = input.variables ?? {};

    return {
      templateId: template.id,
      systemPrompt: template.systemPrompt
        ? this.interpolate(template.systemPrompt, variables)
        : undefined,
      userPrompt: this.interpolate(template.userPromptTemplate, variables),
    };
  }

  /**
   * Supports:
   * - {{variable}}
   * - {{#variable}}...{{/variable}} (include block only when value is truthy)
   */
  interpolate(
    template: string,
    variables: Record<string, string | number | boolean | null | undefined>,
  ): string {
    let result = template.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_match, key: string, block: string) => {
        const value = variables[key];
        if (value === undefined || value === null || value === '' || value === false) {
          return '';
        }
        return block.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value),
        );
      },
    );

    result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        throw new BadRequestException(
          `Missing prompt variable: ${key}`,
        );
      }
      return String(value);
    });

    return result.trim();
  }
}
