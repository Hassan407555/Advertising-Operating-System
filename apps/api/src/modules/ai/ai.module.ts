import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { aiConfig } from './config/ai.config';
import { AiController } from './controllers/ai.controller';
import { AiMapper } from './mappers/ai.mapper';
import { PromptBuilder } from './prompts/prompt.builder';
import { PromptRegistry } from './prompts/prompt.registry';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { GeminiProvider } from './providers/gemini/gemini.provider';
import { GroqProvider } from './providers/groq/groq.provider';
import { AiService } from './services/ai.service';

@Module({
  imports: [ConfigModule.forFeature(aiConfig)],
  controllers: [AiController],
  providers: [
    AiService,
    AiMapper,
    PromptBuilder,
    PromptRegistry,
    AiProviderRegistry,
    GeminiProvider,
    GroqProvider,
  ],
  exports: [AiService, PromptRegistry, PromptBuilder],
})
export class AiModule {}
