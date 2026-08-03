export const META_SYNC_GRAPH_API_VERSION = 'v21.0';
export const META_SYNC_GRAPH_API_BASE_URL = 'https://graph.facebook.com';

export const META_SYNC_OBJECT_FIELDS =
  'id,name,status,effective_status,updated_time';

/** Insights fields required by the Analytics UI KPI / chart surface. */
export const META_SYNC_INSIGHT_FIELDS =
  'spend,impressions,clicks,reach,cpm,cpc,ctr,actions,action_values,purchase_roas';

/** Preferred Meta action types for purchase conversions / revenue. */
export const META_SYNC_PURCHASE_ACTION_TYPES = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
] as const;
