import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AiProviderType,
  DEFAULT_AI_MAX_OUTPUT_TOKENS,
  DEFAULT_AI_TEMPERATURE,
  DEFAULT_GEMINI_MODEL,
} from '../../constants/ai.constants';
import type { AiModuleConfig } from '../../config/ai.config';
import type {
  AiChatOptions,
  AiGenerateJsonOptions,
  AiGenerateTextOptions,
  AiJsonResult,
  AiProvider,
  AiTextResult,
  AiTokenCountResult,
} from '../interfaces/ai-provider.interface';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly type = AiProviderType.GEMINI;

  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generateText(
    options: AiGenerateTextOptions,
  ): Promise<AiTextResult> {
    const model = this.resolveModel(options.model);
    const response = await this.generateContent({
      model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.prompt,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });

    return {
      text: this.extractText(response),
      provider: this.type,
      model,
      usage: this.extractUsage(response),
      raw: response,
    };
  }

  async generateStructuredOutput<T = Record<string, unknown>>(
    options: AiGenerateJsonOptions,
  ): Promise<AiJsonResult<T>> {
    const schemaHint = options.schemaHint
      ? `\n\nReturn JSON matching this shape:\n${options.schemaHint}`
      : '\n\nReturn a valid JSON object only.';

    const textResult = await this.generateText({
      ...options,
      systemPrompt: [
        options.systemPrompt ??
          'You are a helpful assistant that returns only valid JSON.',
        'Do not wrap the response in markdown code fences.',
        'Do not include commentary outside JSON.',
      ].join(' '),
      prompt: `${options.prompt}${schemaHint}`,
    });

    const data = this.parseJson<T>(textResult.text);

    return {
      data,
      provider: this.type,
      model: textResult.model,
      rawText: textResult.text,
      usage: textResult.usage,
      raw: textResult.raw,
    };
  }

  async generateChat(options: AiChatOptions): Promise<AiTextResult> {
    const model = this.resolveModel(options.model);
    const systemParts = options.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content);

    const contents = options.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    if (contents.length === 0) {
      throw new BadRequestException(
        'Chat requires at least one user or assistant message.',
      );
    }

    const response = await this.generateContent({
      model,
      systemPrompt:
        systemParts.length > 0 ? systemParts.join('\n') : undefined,
      contents,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });

    return {
      text: this.extractText(response),
      provider: this.type,
      model,
      usage: this.extractUsage(response),
      raw: response,
    };
  }

  async countTokens(
    text: string,
    model?: string,
  ): Promise<AiTokenCountResult> {
    const resolvedModel = this.resolveModel(model);
    const config = this.getConfig();
    const apiKey = this.requireApiKey(config);

    const url = `${config.gemini.apiBaseUrl}/models/${resolvedModel}:countTokens?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Gemini countTokens failed: ${errorBody}`);
      throw new InternalServerErrorException(
        'Gemini token counting request failed.',
      );
    }

    const payload = (await response.json()) as {
      totalTokens?: number;
    };

    return {
      tokens: payload.totalTokens ?? 0,
      provider: this.type,
      model: resolvedModel,
    };
  }

  private async generateContent(params: {
    model: string;
    systemPrompt?: string;
    userPrompt?: string;
    contents?: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<GeminiGenerateContentResponse> {
    const config = this.getConfig();
    const apiKey = this.requireApiKey(config);
    const url = `${config.gemini.apiBaseUrl}/models/${params.model}:generateContent?key=${apiKey}`;

    const contents =
      params.contents ??
      [
        {
          role: 'user',
          parts: [{ text: params.userPrompt ?? '' }],
        },
      ];

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature:
          params.temperature ??
          config.temperature ??
          DEFAULT_AI_TEMPERATURE,
        maxOutputTokens:
          params.maxOutputTokens ??
          config.maxOutputTokens ??
          DEFAULT_AI_MAX_OUTPUT_TOKENS,
      },
    };

    if (params.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: params.systemPrompt }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload =
      (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok || payload.error) {
      this.logger.error(
        `Gemini generateContent failed: ${JSON.stringify(payload.error ?? payload)}`,
      );
      throw new InternalServerErrorException(
        payload.error?.message ?? 'Gemini generation request failed.',
      );
    }

    return payload;
  }

  private extractText(response: GeminiGenerateContentResponse): string {
    const text = response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new InternalServerErrorException(
        'Gemini returned an empty response.',
      );
    }

    return text;
  }

  private extractUsage(
    response: GeminiGenerateContentResponse,
  ): AiTextResult['usage'] {
    if (!response.usageMetadata) {
      return undefined;
    }

    return {
      inputTokens: response.usageMetadata.promptTokenCount,
      outputTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    };
  }

  private parseJson<T>(text: string): T {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new InternalServerErrorException(
        'Gemini returned invalid JSON.',
      );
    }
  }

  private resolveModel(model?: string): string {
    return model ?? this.getConfig().gemini.model ?? DEFAULT_GEMINI_MODEL;
  }

  private getConfig(): AiModuleConfig {
    return this.configService.getOrThrow<AiModuleConfig>('ai');
  }

  private requireApiKey(config: AiModuleConfig): string {
    if (!config.gemini.apiKey) {
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured.',
      );
    }

    return config.gemini.apiKey;
  }
}
