/**
 * TikTok Marketing API (Business API) constants — V1 publisher scope.
 */
export const TIKTOK_API_BASE_URL =
  'https://business-api.tiktok.com/open_api';

export const TIKTOK_API_VERSION = 'v1.3';

/**
 * V1 TikTok publisher supports only these campaign objectives.
 * Maps internal CampaignObjective → TikTok objective_type.
 */
export const TIKTOK_V1_OBJECTIVE_MAP: Record<string, string> = {
  AWARENESS: 'REACH',
  TRAFFIC: 'TRAFFIC',
  SALES: 'CONVERSIONS',
  ENGAGEMENT: 'ENGAGEMENT',
  LEADS: 'LEAD_GENERATION',
};

export const TIKTOK_V1_SUPPORTED_CREATIVE_TYPES = ['IMAGE'] as const;

export const TIKTOK_V1_CTA_MAP: Record<string, string> = {
  SHOP_NOW: 'SHOP_NOW',
  LEARN_MORE: 'LEARN_MORE',
  ORDER_NOW: 'ORDER_NOW',
  SIGN_UP: 'SIGN_UP',
  GET_OFFER: 'GET_OFFER',
  SEE_MORE: 'LEARN_MORE',
  VISIT_SITE: 'LEARN_MORE',
  CONTACT_US: 'CONTACT_US',
  DOWNLOAD: 'DOWNLOAD',
  GET_STARTED: 'LEARN_MORE',
  BOOK_NOW: 'BOOK_NOW',
  INSTALL_APP: 'DOWNLOAD',
};

/**
 * Common ISO country codes → TikTok location_ids (GeoNames-based).
 * Used for V1 geo targeting when ad set targeting.countries is present.
 */
export const TIKTOK_V1_COUNTRY_LOCATION_IDS: Record<string, string> = {
  US: '6252001',
  GB: '2635167',
  CA: '6251999',
  AU: '2077456',
  DE: '2921044',
  FR: '3017382',
  IT: '3175395',
  ES: '2510769',
  BR: '3469034',
  MX: '3996063',
  JP: '1861060',
  IN: '1269750',
  NL: '2750405',
  SE: '2661886',
  NO: '3144096',
  DK: '2623032',
  FI: '660013',
  IE: '2963597',
  NZ: '2186224',
  SG: '1880251',
  AE: '290557',
  SA: '102358',
};

/** Paused / draft-equivalent status for TikTok create payloads. */
export const TIKTOK_OPERATION_STATUS_PAUSED = 'DISABLE';
