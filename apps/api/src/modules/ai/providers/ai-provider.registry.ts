import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AiModuleConfig } from '../config/ai.config';
import { AiProviderType } from '../constants/ai.constants';
import type { AiProvider } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './gemini/gemini.provider';
import { GroqProvider } from './groq/groq.provider';

@Injectable()
export class AiProviderRegistry implements OnModuleInit {
  private readonly providers = new Map<AiProviderType, AiProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
  ) {}

  onModuleInit(): void {
    this.register(this.geminiProvider);
    this.register(this.groqProvider);
    // Future: this.register(this.openAiProvider);
    // Future: this.register(this.anthropicProvider);
  }

  register(provider: AiProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: AiProviderType): AiProvider {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new BadRequestException(
        `AI provider is not registered: ${type}`,
      );
    }

    return provider;
  }

  getPrimary(): AiProvider {
    const config = this.configService.getOrThrow<AiModuleConfig>('ai');
    return this.get(config.provider);
  }

  getFallbackChain(): AiProvider[] {
    const config = this.configService.getOrThrow<AiModuleConfig>('ai');
    const chain: AiProvider[] = [this.getPrimary()];

    for (const fallback of config.fallbackProviders) {
      if (fallback === config.provider) {
        continue;
      }

      const provider = this.providers.get(fallback);
      if (provider) {
        chain.push(provider);
      }
    }

    return chain;
  }
}
