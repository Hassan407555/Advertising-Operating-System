import { z } from "zod";
import type { SessionTokens } from "@/types/auth";

const TOKEN_KEY = "aos.session.tokens";
const ACCESS_COOKIE_KEY = "aos.access-token";
/** Align cookie lifetime with persisted local session (7 days). */
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const sessionTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

function buildAccessCookie(value: string, maxAge: number): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `${ACCESS_COOKIE_KEY}=${value}; path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function readTokens(): SessionTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = sessionTokensSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function writeTokens(tokens: SessionTokens | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!tokens) {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = buildAccessCookie("", 0);
    return;
  }

  const parsed = sessionTokensSchema.safeParse(tokens);
  if (!parsed.success) {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = buildAccessCookie("", 0);
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(parsed.data));
  document.cookie = buildAccessCookie(parsed.data.accessToken, ACCESS_COOKIE_MAX_AGE_SECONDS);
}

/** Re-sync the access cookie from localStorage (e.g. after browser restart cleared session cookies). */
export function syncAccessCookieFromStorage(): boolean {
  const tokens = readTokens();
  if (!tokens) {
    return false;
  }
  writeTokens(tokens);
  return true;
}
