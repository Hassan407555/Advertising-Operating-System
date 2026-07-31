const ALLOWED_META_OAUTH_HOSTS = new Set([
  "www.facebook.com",
  "facebook.com",
  "m.facebook.com",
]);

/**
 * Validates Meta OAuth authorization URLs before browser navigation.
 */
export function isAllowedMetaAuthorizationUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return false;
    }

    const host = url.hostname.toLowerCase();
    if (!ALLOWED_META_OAUTH_HOSTS.has(host)) {
      return false;
    }

    return url.pathname.includes("/dialog/oauth");
  } catch {
    return false;
  }
}
