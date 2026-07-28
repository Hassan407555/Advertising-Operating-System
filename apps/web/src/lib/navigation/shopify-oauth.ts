const ALLOWED_SHOPIFY_OAUTH_HOST_SUFFIXES = [".myshopify.com", ".shopify.com", "shopify.com"] as const;

/**
 * Validates Shopify OAuth authorization URLs before browser navigation.
 */
export function isAllowedShopifyAuthorizationUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return false;
    }

    const host = url.hostname.toLowerCase();
    return ALLOWED_SHOPIFY_OAUTH_HOST_SUFFIXES.some(
      (suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix),
    );
  } catch {
    return false;
  }
}
