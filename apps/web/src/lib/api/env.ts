const FALLBACK_API_URL = "http://127.0.0.1:3001/api";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const isRelativeApiBaseUrl = Boolean(configuredBaseUrl?.startsWith("/"));

/**
 * In local development, a relative "/api" base points to Next.js itself.
 * Our Nest API runs on :3001, so force the backend origin to avoid
 * accidental calls like "Cannot POST /api/publisher/publish" from web.
 */
const shouldUseFallbackForLocalRelativeBase =
  process.env.NODE_ENV !== "production" && isRelativeApiBaseUrl;

const resolvedBaseUrl =
  shouldUseFallbackForLocalRelativeBase || !configuredBaseUrl
    ? FALLBACK_API_URL
    : configuredBaseUrl;

if (process.env.NODE_ENV === "production" && !configuredBaseUrl) {
  // Surface misconfiguration early in production builds/runtime.
  console.error("NEXT_PUBLIC_API_BASE_URL is not set; falling back to localhost API URL.");
}

if (shouldUseFallbackForLocalRelativeBase) {
  console.warn(
    `NEXT_PUBLIC_API_BASE_URL is relative (${configuredBaseUrl}); using ${FALLBACK_API_URL} in development.`,
  );
}

export const API_BASE_URL = resolvedBaseUrl;
export const API_TIMEOUT_MS = 15_000;
/** Gemini campaign generation can take up to 60s server-side. */
export const API_GENERATE_TIMEOUT_MS = 120_000;
/** Product showcase video render via SimpleVideoProvider. */
export const API_GENERATE_VIDEO_TIMEOUT_MS = 120_000;
export const API_UPLOAD_TIMEOUT_MS = 60_000;
