export interface PromptTemplate {
  id: string;
  description: string;
  systemPrompt?: string;
  userPromptTemplate: string;
}

export interface PromptBuildInput {
  templateId: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
}

export interface BuiltPrompt {
  templateId: string;
  systemPrompt?: string;
  userPrompt: string;
}
