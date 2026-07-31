export enum AiProviderType {
  GEMINI = 'GEMINI',
  GROQ = 'GROQ',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  AZURE_OPENAI = 'AZURE_OPENAI',
  OLLAMA = 'OLLAMA',
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export const DEFAULT_AI_PROVIDER = AiProviderType.GEMINI;

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export const DEFAULT_GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

export const DEFAULT_AI_TEMPERATURE = 0.7;

export const DEFAULT_AI_MAX_OUTPUT_TOKENS = 2048;
