/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs (`//evil.com`) and absolute URLs.
 */
export function getSafeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    if (url.origin !== "http://localhost") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
