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
  'For NONE campaigns, plan campaign/ad set/ad structure without requiring uploaded media.',
  'Never generate or invent image or video binary assets.',
  'Never invent analytics numbers that were not provided.',
  'Never invent product facts (ingredients, certifications, prices, claims) that are not present in the product input or interview answers.',
  'Never use placeholder text such as TODO, TBD, N/A, lorem ipsum, "your product", "sample", or empty strings.',
  'Keep recommendations practical for Meta Ads (IMAGE, CAROUSEL, VIDEO, or NONE).',
  'Campaign name, audience, primary copy, headlines/descriptions, CTA, and creative guidance must be coherent and mutually consistent.',
].join(' ');

/**
 * Builds one structured prompt from product, analytics, store, and interview inputs.
 * Intentionally not a prompt registry / versioning system.
 */
export class MetaCampaignPromptBuilder {
  build(inputs: MetaCampaignGeneratorInputs): BuiltMetaCampaignPrompt {
    const schemaHint = schemaHintForCampaignType(inputs.campaignType);

    const qualityInstructions =
      inputs.campaignType === 'IMAGE'
        ? [
            '- creativeBrief MUST include these labeled sections in prose: Hook:, Pain Points:, Benefits:, Offer:, Tone of Voice:.',
            '- headlines and primaryText must reinforce the same offer and tone as creativeBrief.',
            '- description must support the primaryText without repeating it verbatim.',
          ]
        : inputs.campaignType === 'CAROUSEL'
          ? [
              '- creativeStrategy MUST include labeled sections: Hook:, Pain Points:, Benefits:, Offer:, Tone of Voice:.',
              '- cardTitles/cardDescriptions must each advance a distinct benefit while staying consistent with the strategy.',
            ]
          : inputs.campaignType === 'NONE'
            ? [
                '- Set requiresCreative to false (always).',
                '- creativeNotes should explain that creative will be attached later (existing post, existing creative, or placeholder).',
                '- Do NOT invent image URLs, video URLs, carousel cards, or media assets.',
                '- Optional headline/primaryText may be included as draft copy for a later creative.',
              ]
            : [
                '- hook and videoScript MUST imply pain points, benefits, and offer angle while stating a clear tone.',
                '- storyboard and shotList must support the hook/script without contradiction.',
              ];

    const regenerationInstructions = inputs.isRegeneration
      ? [
          '',
          '## Regeneration Requirements',
          '- This is a REGENERATION. Do not reuse prior campaign copy.',
          '- Produce a clearly different creative angle than a generic first draft.',
          '- Change campaignName nuance, primaryText, headlines, description, and creativeBrief/strategy wording substantially.',
          '- Keep objective, budget, country/language grounding, and product facts consistent with inputs.',
        ]
      : [];

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
      '- Ground every claim in the product title/description/variants/images/tags or interview answers.',
      '- Every string field must be specific, non-empty, and free of placeholder filler.',
      '- For CTA, use a Meta-style enum value such as SHOP_NOW, LEARN_MORE, SIGN_UP, or BUY_NOW (not free-form title case).',
      '- Prefer product-grounded wording; avoid unverified superlatives like "best-selling" unless present in product or analytics inputs.',
      ...qualityInstructions,
      ...regenerationInstructions,
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
