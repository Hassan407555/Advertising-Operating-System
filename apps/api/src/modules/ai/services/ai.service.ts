import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AiModuleConfig } from '../config/ai.config';
import type {
  AiChatOptions,
  AiGenerateJsonOptions,
  AiGenerateTextOptions,
  AiJsonResult,
  AiTextResult,
  AiTokenCountResult,
} from '../providers/interfaces/ai-provider.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { PromptBuilder } from '../prompts/prompt.builder';
import type { PromptBuildInput } from '../interfaces/prompt.interfaces';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly providerRegistry: AiProviderRegistry,
    private readonly promptBuilder: PromptBuilder,
    private readonly configService: ConfigService,
  ) {}

  async generateText(
    options: AiGenerateTextOptions,
  ): Promise<AiTextResult> {
    return this.executeWithFallback((provider) =>
      provider.generateText(options),
    );
  }

  async generateJson<T = Record<string, unknown>>(
    options: AiGenerateJsonOptions,
  ): Promise<AiJsonResult<T>> {
    return this.executeWithFallback((provider) =>
      provider.generateStructuredOutput<T>(options),
    );
  }

  async chat(options: AiChatOptions): Promise<AiTextResult> {
    return this.executeWithFallback((provider) =>
      provider.generateChat(options),
    );
  }

  async countTokens(
    text: string,
    model?: string,
  ): Promise<AiTokenCountResult> {
    return this.executeWithFallback((provider) =>
      provider.countTokens(text, model),
    );
  }

  /**
   * Builds a prompt from a registered template, then generates text.
   * Feature modules can register their own templates via PromptRegistry.
   */
  async generateFromTemplate(
    input: PromptBuildInput,
    options?: Omit<AiGenerateTextOptions, 'prompt' | 'systemPrompt'>,
  ): Promise<AiTextResult> {
    const built = this.promptBuilder.build(input);

    return this.generateText({
      ...options,
      prompt: built.userPrompt,
      systemPrompt: built.systemPrompt,
    });
  }

  /**
   * Builds a prompt from a registered template, then generates structured JSON.
   */
  async generateJsonFromTemplate<T = Record<string, unknown>>(
    input: PromptBuildInput,
    options?: Omit<AiGenerateJsonOptions, 'prompt' | 'systemPrompt'>,
  ): Promise<AiJsonResult<T>> {
    const built = this.promptBuilder.build(input);

    return this.generateJson<T>({
      ...options,
      prompt: built.userPrompt,
      systemPrompt: built.systemPrompt,
    });
  }

  getActiveProviderName(): string {
    const config = this.configService.getOrThrow<AiModuleConfig>('ai');
    return config.provider;
  }

  private async executeWithFallback<T>(
    operation: (
      provider: ReturnType<AiProviderRegistry['getPrimary']>,
    ) => Promise<T>,
  ): Promise<T> {
    const chain = this.providerRegistry.getFallbackChain();
    let lastError: unknown;

    for (let index = 0; index < chain.length; index += 1) {
      const provider = chain[index];
      const isLast = index === chain.length - 1;

      try {
        return await operation(provider);
      } catch (error) {
        lastError = error;

        if (this.shouldNotFallback(error) || isLast) {
          throw error;
        }

        this.logger.warn(
          `AI provider ${provider.type} failed with a retriable error. Trying next provider.`,
        );
      }
    }

    throw lastError;
  }

  /**
   * Configuration and client/validation errors must not trigger provider fallback.
   * Only retriable/server-side provider failures should continue the chain.
   */
  private shouldNotFallback(error: unknown): boolean {
    if (!(error instanceof HttpException)) {
      return false;
    }

    const status = error.getStatus();

    return (
      status === HttpStatus.BAD_REQUEST ||
      status === HttpStatus.UNAUTHORIZED ||
      status === HttpStatus.FORBIDDEN ||
      status === HttpStatus.NOT_FOUND ||
      status === HttpStatus.UNPROCESSABLE_ENTITY ||
      status === HttpStatus.TOO_MANY_REQUESTS ||
      (status >= 400 && status < 500)
    );
  }
}
