export const META_GRAPH_API_BASE_URL = 'https://graph.facebook.com';

export const META_OAUTH_DIALOG_BASE_URL = 'https://www.facebook.com';

/**
 * Facebook Login scopes for advertising config: ads, Business Manager,
 * Pages, pixels, catalogs, and Instagram Business accounts via linked Pages.
 * Omit `instagram_basic` — invalid for Business Facebook Login (Basic Display).
 */
export const META_OAUTH_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
] as const;

export const META_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function getMetaGraphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || 'v23.0';
}

export function getMetaAuthorizeUrl(): string {
  return `${META_OAUTH_DIALOG_BASE_URL}/${getMetaGraphApiVersion()}/dialog/oauth`;
}

export function getMetaGraphUrl(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${META_GRAPH_API_BASE_URL}/${getMetaGraphApiVersion()}/${normalized}`;
}
