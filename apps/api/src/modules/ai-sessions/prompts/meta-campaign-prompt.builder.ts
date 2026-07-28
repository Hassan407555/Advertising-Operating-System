import type { MetaCampaignGeneratorInputs } from '../types/generated-campaign.types';
import { schemaHintForCampaignType } from '../schemas/generated-campaign.schema';

export interface BuiltMetaCampaignPrompt {
  systemPrompt: string;
  userPrompt: string;
  schemaHint: string;
}

const SYSTEM_PROMPT = [
  'You are an experienced Meta Ads strategist.',
  'Generate a complete Meta Ads campaign plan as structured JSON only.',
  'Do not wrap the response in markdown code fences.',
  'Do not include commentary outside JSON.',
  'Prefer Shopify product images and existing assets in creative guidance.',
  'For video campaigns, produce planning only (hook, script, storyboard, shot list).',
  'Never generate or invent image or video binary assets.',
  'Never invent analytics numbers that were not provided.',
  'Keep recommendations practical for Meta Ads (IMAGE, CAROUSEL, or VIDEO only).',
].join(' ');

/**
 * Builds one structured prompt from product, analytics, store, and interview inputs.
 * Intentionally not a prompt registry / versioning system.
 */
export class MetaCampaignPromptBuilder {
  build(inputs: MetaCampaignGeneratorInputs): BuiltMetaCampaignPrompt {
    const schemaHint = schemaHintForCampaignType(inputs.campaignType);

    const userPrompt = [
      'Create a Meta Ads campaign using the following inputs.',
      '',
      '## Product',
      JSON.stringify(inputs.product, null, 2),
      '',
      '## Analytics',
      JSON.stringify(inputs.analytics, null, 2),
      '',
      '## Store',
      JSON.stringify(inputs.store, null, 2),
      '',
      '## Interview Answers',
      JSON.stringify(inputs.interviewAnswers, null, 2),
      '',
      `## Required Campaign Type`,
      inputs.campaignType,
      '',
      '## Instructions',
      `- Return ONLY valid JSON matching the ${inputs.campaignType} schema.`,
      '- Use interview answers for objective, budget, country, language, and adaptive creative options.',
      '- Infer a clear audience description from product + country/language/objective when audience is not explicit.',
      '- If analytics.available is false, note limited historical data in creative strategy/brief — do not fabricate metrics.',
      '- Budget.dailyBudget should reflect the interview dailyBudget when provided.',
      '',
      '## JSON Schema',
      schemaHint,
    ].join('\n');

    return {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schemaHint,
    };
  }
}
