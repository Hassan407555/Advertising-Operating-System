import { PromptTemplate } from '../../interfaces/prompt.interfaces';

/**
 * Generic reusable templates only.
 * Business-specific prompts belong in future feature modules / registries.
 */
export const GENERIC_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'plain_text',
    description: 'Generic free-form text generation from a prompt variable.',
    systemPrompt:
      'You are a helpful assistant. Respond clearly and concisely.',
    userPromptTemplate: '{{prompt}}',
  },
  {
    id: 'json_response',
    description: 'Generic JSON response generation with an optional schema hint.',
    systemPrompt: [
      'You are a helpful assistant that returns only valid JSON.',
      'Do not wrap the response in markdown fences.',
      'Do not include commentary outside the JSON object.',
    ].join(' '),
    userPromptTemplate: [
      '{{prompt}}',
      '',
      '{{#schemaHint}}Expected JSON shape: {{schemaHint}}{{/schemaHint}}',
    ].join('\n'),
  },
];
