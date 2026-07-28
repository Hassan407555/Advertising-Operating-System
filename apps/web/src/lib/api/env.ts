const FALLBACK_API_URL = "http://localhost:3000/api";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (process.env.NODE_ENV === "production" && !configuredBaseUrl) {
  // Surface misconfiguration early in production builds/runtime.
  console.error("NEXT_PUBLIC_API_BASE_URL is not set; falling back to localhost API URL.");
}

export const API_BASE_URL = configuredBaseUrl ?? FALLBACK_API_URL;
export const API_TIMEOUT_MS = 15_000;
export const API_UPLOAD_TIMEOUT_MS = 60_000;
