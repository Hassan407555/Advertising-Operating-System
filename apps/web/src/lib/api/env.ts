const FALLBACK_API_URL = "http://localhost:3000/api";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_URL;
export const API_TIMEOUT_MS = 15_000;
export const API_UPLOAD_TIMEOUT_MS = 60_000;
