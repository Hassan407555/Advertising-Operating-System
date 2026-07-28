import { PublisherPlatform } from '../enums/publisher.enums';

export const PUBLISHER_PROVIDER = Symbol('PUBLISHER_PROVIDER');

/**
 * Platforms intended for advertising publish flows.
 * Providers register themselves; this list documents the roadmap.
 */
export const PUBLISHER_ROADMAP_PLATFORMS: PublisherPlatform[] = [
  PublisherPlatform.META,
  PublisherPlatform.TIKTOK,
  PublisherPlatform.GOOGLE,
  PublisherPlatform.LINKEDIN,
];

/** Platforms enabled for v1 product scope (Meta + TikTok). */
export const PUBLISHER_V1_PLATFORMS: PublisherPlatform[] = [
  PublisherPlatform.META,
  PublisherPlatform.TIKTOK,
];
