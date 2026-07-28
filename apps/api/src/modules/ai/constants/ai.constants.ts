export enum AiProviderType {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  AZURE_OPENAI = 'AZURE_OPENAI',
  OLLAMA = 'OLLAMA',
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export const DEFAULT_AI_PROVIDER = AiProviderType.GEMINI;

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export const DEFAULT_AI_TEMPERATURE = 0.7;

export const DEFAULT_AI_MAX_OUTPUT_TOKENS = 2048;
