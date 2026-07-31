import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AiProviderType,
  DEFAULT_AI_MAX_OUTPUT_TOKENS,
  DEFAULT_AI_TEMPERATURE,
  DEFAULT_GROQ_MODEL,
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

interface GroqChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

const GROQ_REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class GroqProvider implements AiProvider {
  readonly type = AiProviderType.GROQ;

  private readonly logger = new Logger(GroqProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generateText(
    options: AiGenerateTextOptions,
  ): Promise<AiTextResult> {
    const model = this.resolveModel(options.model);
    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const response = await this.chatCompletions({
      model,
      messages,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });

    return {
      text: this.extractText(response),
      provider: this.type,
      model: response.model ?? model,
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

    const model = this.resolveModel(options.model);
    const systemPrompt = [
      options.systemPrompt ??
        'You are a helpful assistant that returns only valid JSON.',
      'Do not wrap the response in markdown code fences.',
      'Do not include commentary outside JSON.',
    ].join(' ');

    const response = await this.chatCompletions({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${options.prompt}${schemaHint}` },
      ],
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      jsonObject: true,
    });

    const rawText = this.extractText(response);
    const data = this.parseJson<T>(rawText);

    return {
      data,
      provider: this.type,
      model: response.model ?? model,
      rawText,
      usage: this.extractUsage(response),
      raw: response,
    };
  }

  async generateChat(options: AiChatOptions): Promise<AiTextResult> {
    const model = this.resolveModel(options.model);

    if (options.messages.length === 0) {
      throw new BadRequestException(
        'Chat requires at least one message.',
      );
    }

    const response = await this.chatCompletions({
      model,
      messages: options.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });

    return {
      text: this.extractText(response),
      provider: this.type,
      model: response.model ?? model,
      usage: this.extractUsage(response),
      raw: response,
    };
  }

  async countTokens(
    text: string,
    model?: string,
  ): Promise<AiTokenCountResult> {
    // Groq does not expose a public countTokens API; approximate like OpenAI heuristics.
    return {
      tokens: Math.max(1, Math.ceil(text.length / 4)),
      provider: this.type,
      model: this.resolveModel(model),
    };
  }

  private async chatCompletions(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxOutputTokens?: number;
    jsonObject?: boolean;
  }): Promise<GroqChatCompletionResponse> {
    const config = this.getConfig();
    const apiKey = this.requireApiKey(config);
    const url = `${config.groq.apiBaseUrl.replace(/\/$/, '')}/chat/completions`;

    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature:
        params.temperature ??
        config.temperature ??
        DEFAULT_AI_TEMPERATURE,
      max_tokens:
        params.maxOutputTokens ??
        config.maxOutputTokens ??
        DEFAULT_AI_MAX_OUTPUT_TOKENS,
    };

    if (params.jsonObject) {
      body.response_format = { type: 'json_object' };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GROQ_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new InternalServerErrorException(
          'Groq timed out while generating a response.',
        );
      }
      this.logger.error(
        `Groq network failure: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Groq network request failed.',
      );
    }

    let payload: GroqChatCompletionResponse;
    try {
      payload = (await response.json()) as GroqChatCompletionResponse;
    } catch {
      throw new InternalServerErrorException(
        'Groq returned a malformed response body.',
      );
    }

    if (!response.ok || payload.error) {
      const message =
        payload.error?.message ??
        `Groq generation request failed (${response.status}).`;
      this.logger.error(`Groq chat/completions failed: ${message}`);

      if (response.status === 401 || response.status === 403) {
        throw new BadRequestException(
          'GROQ_API_KEY is invalid or unauthorized.',
        );
      }

      if (response.status === 429) {
        throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
      }

      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(message);
      }

      throw new InternalServerErrorException(message);
    }

    return payload;
  }

  private extractText(response: GroqChatCompletionResponse): string {
    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new InternalServerErrorException(
        'Groq returned an empty response.',
      );
    }

    return text;
  }

  private extractUsage(
    response: GroqChatCompletionResponse,
  ): AiTextResult['usage'] {
    if (!response.usage) {
      return undefined;
    }

    return {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
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
        'Groq returned invalid JSON.',
      );
    }
  }

  private resolveModel(model?: string): string {
    return model ?? this.getConfig().groq.model ?? DEFAULT_GROQ_MODEL;
  }

  private getConfig(): AiModuleConfig {
    return this.configService.getOrThrow<AiModuleConfig>('ai');
  }

  private requireApiKey(config: AiModuleConfig): string {
    if (!config.groq.apiKey) {
      throw new BadRequestException(
        'GROQ_API_KEY is not configured.',
      );
    }

    return config.groq.apiKey;
  }
}
