import { ROUTES } from "@/constants/routes";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";

const JOURNEY_RETURN_STORAGE_KEY = "aos.journey.returnTo";

/** Anchor on Campaign Details for the Publishing Checklist wizard. */
export const PUBLISHING_CHECKLIST_ANCHOR = "publishing-checklist";

function toSafeReturnPath(path: string | null | undefined): string | null {
  if (!path?.trim()) {
    return null;
  }

  const safe = getSafeRedirectPath(path, "/__invalid__");
  if (safe === "/__invalid__") {
    return null;
  }

  return safe;
}

/**
 * Persist a same-origin path so setup screens (Advertising, Shopify, sync)
 * can return the user to the originating campaign after completion.
 */
export function setJourneyReturnTo(path: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  const safe = toSafeReturnPath(path);
  if (!safe) {
    return;
  }

  try {
    window.sessionStorage.setItem(JOURNEY_RETURN_STORAGE_KEY, safe);
  } catch {
    // Ignore quota / private-mode failures; query param still works.
  }
}

export function peekJourneyReturnTo(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(JOURNEY_RETURN_STORAGE_KEY);
    return toSafeReturnPath(raw);
  } catch {
    return null;
  }
}

/** Read and clear stored return path. */
export function consumeJourneyReturnTo(): string | null {
  const value = peekJourneyReturnTo();
  clearJourneyReturnTo();
  return value;
}

export function clearJourneyReturnTo(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(JOURNEY_RETURN_STORAGE_KEY);
  } catch {
    // no-op
  }
}

/**
 * Resolve return target from URL `returnTo` (preferred) or session storage.
 * Does not clear storage — call `consumeJourneyReturnTo` only after a successful save navigate.
 */
export function resolveJourneyReturnTo(
  searchReturnTo: string | null | undefined,
): string | null {
  const fromQuery = toSafeReturnPath(searchReturnTo);
  if (fromQuery) {
    setJourneyReturnTo(fromQuery);
    return fromQuery;
  }

  return peekJourneyReturnTo();
}

/** Campaign Details path that scrolls to the Publishing Checklist on return. */
export function buildCampaignChecklistReturnPath(campaignId: string): string {
  return `${ROUTES.CAMPAIGN_DETAILS(campaignId)}#${PUBLISHING_CHECKLIST_ANCHOR}`;
}

/**
 * Build any setup destination href that carries a return path.
 * Also persists returnTo in session storage for OAuth round-trips.
 */
export function buildJourneyHref(
  destinationPath: string,
  returnTo?: string | null,
): string {
  const safeReturn = toSafeReturnPath(returnTo);
  if (!safeReturn) {
    return destinationPath;
  }

  setJourneyReturnTo(safeReturn);

  try {
    const url = new URL(destinationPath, "http://localhost");
    url.searchParams.set("returnTo", safeReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const params = new URLSearchParams({ returnTo: safeReturn });
    const joiner = destinationPath.includes("?") ? "&" : "?";
    return `${destinationPath}${joiner}${params.toString()}`;
  }
}

/** Build Advertising setup href, optionally carrying a return path. */
export function buildAdvertisingSetupHref(returnTo?: string | null): string {
  return buildJourneyHref(ROUTES.ADVERTISING_CONFIGURATION, returnTo);
}

/** Advertising path that preserves returnTo after OAuth query cleanup. */
export function buildAdvertisingPathPreservingReturn(
  returnTo?: string | null,
): string {
  const safe = toSafeReturnPath(returnTo) ?? peekJourneyReturnTo();
  if (!safe) {
    return ROUTES.ADVERTISING_CONFIGURATION;
  }

  const params = new URLSearchParams({ returnTo: safe });
  return `${ROUTES.ADVERTISING_CONFIGURATION}?${params.toString()}`;
}

/** Navigate helper target after a successful setup step. */
export function resolveSetupCompletionPath(
  searchReturnTo?: string | null,
  fallback?: string,
): string | null {
  return (
    toSafeReturnPath(searchReturnTo) ??
    peekJourneyReturnTo() ??
    toSafeReturnPath(fallback)
  );
}
