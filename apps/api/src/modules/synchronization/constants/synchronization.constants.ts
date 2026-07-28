import { SynchronizationPlatform } from '../enums/synchronization.enums';

export const SYNCHRONIZATION_V1_PLATFORMS: SynchronizationPlatform[] = [
  SynchronizationPlatform.META,
  SynchronizationPlatform.TIKTOK,
];

/** Lifetime / rollup window used when pulling insights for entity metrics. */
export const SYNC_DEFAULT_DATE_PRESET = 'last_30d';

/** Prefixes that indicate the entity was never published to a live platform. */
export const SYNC_LOCAL_EXTERNAL_ID_PREFIXES = [
  'local_',
  'meta_dry_',
  'tiktok_dry_',
] as const;
