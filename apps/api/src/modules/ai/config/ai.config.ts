import { registerAs } from '@nestjs/config';

import {
  AiProviderType,
  DEFAULT_AI_MAX_OUTPUT_TOKENS,
  DEFAULT_AI_PROVIDER,
  DEFAULT_AI_TEMPERATURE,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_API_BASE_URL,
  DEFAULT_GROQ_MODEL,
} from '../constants/ai.constants';

export interface AiModuleConfig {
  provider: AiProviderType;
  fallbackProviders: AiProviderType[];
  temperature: number;
  maxOutputTokens: number;
  gemini: {
    apiKey?: string;
    model: string;
    apiBaseUrl: string;
  };
  groq: {
    apiKey?: string;
    model: string;
    apiBaseUrl: string;
  };
}

function parseProvider(value: unknown): AiProviderType {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return DEFAULT_AI_PROVIDER;
  }

  const normalized = value.trim().toUpperCase();

  if (
    Object.values(AiProviderType).includes(normalized as AiProviderType)
  ) {
    return normalized as AiProviderType;
  }

  return DEFAULT_AI_PROVIDER;
}

function parseFallbackProviders(value: unknown): AiProviderType[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) =>
      Object.values(AiProviderType).includes(item as AiProviderType),
    )
    .map((item) => item as AiProviderType);
}

export const aiConfig = registerAs(
  'ai',
  (): AiModuleConfig => ({
    provider: parseProvider(process.env.AI_PROVIDER),
    fallbackProviders: parseFallbackProviders(
      process.env.AI_FALLBACK_PROVIDERS,
    ),
    temperature: Number(process.env.AI_TEMPERATURE ?? DEFAULT_AI_TEMPERATURE),
    maxOutputTokens: Number(
      process.env.AI_MAX_OUTPUT_TOKENS ?? DEFAULT_AI_MAX_OUTPUT_TOKENS,
    ),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      apiBaseUrl:
        process.env.GEMINI_API_BASE_URL ??
        'https://generativelanguage.googleapis.com/v1beta',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
      apiBaseUrl:
        process.env.GROQ_API_BASE_URL ?? DEFAULT_GROQ_API_BASE_URL,
    },
  }),
);
