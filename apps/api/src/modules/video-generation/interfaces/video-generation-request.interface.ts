/**
 * Platform-agnostic inputs for product showcase video generation.
 * Callers collect product images and copy — this module does not fetch Shopify.
 */
export interface VideoGenerationRequest {
  /** Publicly reachable product image URLs (1–3 recommended). */
  imageUrls: string[];
  productTitle: string;
  headline: string;
  cta: string;
  description?: string | null;
  /** Desired total length; clamped to ~5–10s by the provider. */
  durationSeconds?: number;
}
