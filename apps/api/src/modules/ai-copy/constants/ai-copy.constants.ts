export const MARKETING_COPY_PROMPT_TEMPLATE_ID = 'marketing_copy';

/** Max page size used when loading campaign graph entities. */
export const AI_COPY_GRAPH_PAGE_LIMIT = 100;

export const MARKETING_COPY_JSON_SCHEMA_HINT = `{
  "primaryText": "string",
  "headline": "string",
  "description": "string",
  "cta": "string (human readable, e.g. Shop Now)",
  "ctaEnum": "SHOP_NOW | LEARN_MORE | ORDER_NOW | GET_OFFER | SIGN_UP | SEE_MORE | VISIT_SITE",
  "suggestedHook": "string",
  "painPoints": ["string"],
  "benefits": ["string"],
  "targetAudienceSummary": "string",
  "offerAngle": "string",
  "marketingAngle": "string",
  "platformNotes": "string",
  "tone": "string"
}`;
