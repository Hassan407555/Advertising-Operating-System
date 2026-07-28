"use client";

import type { SessionTokens } from "@/types/auth";

const TOKEN_KEY = "aos.session.tokens";
const ACCESS_COOKIE_KEY = "aos.access-token";

export function readTokens(): SessionTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
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
    document.cookie = `${ACCESS_COOKIE_KEY}=; Max-Age=0; path=/; samesite=lax`;
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  document.cookie = `${ACCESS_COOKIE_KEY}=${tokens.accessToken}; path=/; samesite=lax`;
}
