export const META_GRAPH_API_VERSION = 'v21.0';

export const META_GRAPH_API_BASE_URL = 'https://graph.facebook.com';

/**
 * V1 Meta publisher supports only these campaign objectives.
 * Maps internal CampaignObjective → Meta OUTCOME_* objective.
 */
export const META_V1_OBJECTIVE_MAP: Record<string, string> = {
  AWARENESS: 'OUTCOME_AWARENESS',
  TRAFFIC: 'OUTCOME_TRAFFIC',
  SALES: 'OUTCOME_SALES',
  ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  LEADS: 'OUTCOME_LEADS',
};

export const META_V1_SUPPORTED_CREATIVE_TYPES = ['IMAGE', 'TEXT'] as const;

export const META_V1_CTA_MAP: Record<string, string> = {
  SHOP_NOW: 'SHOP_NOW',
  LEARN_MORE: 'LEARN_MORE',
  ORDER_NOW: 'ORDER_NOW',
  SIGN_UP: 'SIGN_UP',
  GET_OFFER: 'GET_OFFER',
  SEE_MORE: 'SEE_MORE',
  VISIT_SITE: 'LEARN_MORE',
  CONTACT_US: 'CONTACT_US',
};
