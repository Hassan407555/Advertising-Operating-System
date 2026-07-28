import { AiProviderType } from '../../constants/ai.constants';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiGenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiGenerateJsonOptions extends AiGenerateTextOptions {
  /**
   * Optional JSON schema description for the model (prompt guidance only).
   */
  schemaHint?: string;
}

export interface AiChatOptions {
  messages: AiChatMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiTextResult {
  text: string;
  provider: AiProviderType;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export interface AiJsonResult<T = Record<string, unknown>> {
  data: T;
  provider: AiProviderType;
  model: string;
  rawText: string;
  usage?: AiTextResult['usage'];
  raw?: unknown;
}

export interface AiTokenCountResult {
  tokens: number;
  provider: AiProviderType;
  model?: string;
}

/**
 * Provider contract. Business modules never depend on this directly —
 * they use AiService instead.
 */
export interface AiProvider {
  readonly type: AiProviderType;

  generateText(options: AiGenerateTextOptions): Promise<AiTextResult>;

  generateStructuredOutput<T = Record<string, unknown>>(
    options: AiGenerateJsonOptions,
  ): Promise<AiJsonResult<T>>;

  generateChat(options: AiChatOptions): Promise<AiTextResult>;

  countTokens(text: string, model?: string): Promise<AiTokenCountResult>;
}
