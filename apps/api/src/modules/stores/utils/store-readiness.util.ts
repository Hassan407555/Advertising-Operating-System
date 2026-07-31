export type StoreHealthStatus = 'HEALTHY' | 'NEEDS_ATTENTION' | 'NOT_READY';

export interface StoreCapabilityInput {
  shopifyConnected: boolean;
  metaConnected: boolean;
  productsSynced: boolean;
  productCount: number;
  lastSyncAt: string | null;
  adAccountSelected: boolean;
  facebookPageSelected: boolean;
  instagramSelected: boolean;
  pixelSelected: boolean;
  catalogSelected: boolean;
  /** External Meta Business Manager ID selected in advertising configuration. */
  businessManagerSelected?: boolean;
}

/**
 * Gates for starting AI campaign work (interview → generate → draft).
 * Meta is intentionally excluded — required only at Publish to Meta.
 */
export function getGenerationBlockingReasons(
  capabilities: StoreCapabilityInput,
): string[] {
  const blocking: string[] = [];

  if (!capabilities.shopifyConnected) {
    blocking.push('Shopify is not connected');
  }
  if (!capabilities.productsSynced) {
    blocking.push('Products are not synced');
  }

  return blocking;
}

export function isGenerationReady(capabilities: StoreCapabilityInput): boolean {
  return getGenerationBlockingReasons(capabilities).length === 0;
}

/**
 * Gates for publishing a draft into Meta Ads Manager.
 * Does not block AI generation, sessions, or draft save.
 */
export function getMetaPublishBlockingReasons(
  capabilities: StoreCapabilityInput,
): string[] {
  const blocking: string[] = [];

  if (!capabilities.metaConnected) {
    blocking.push('Meta is not connected');
  }
  if (!capabilities.businessManagerSelected) {
    blocking.push('Business Manager is not selected');
  }
  if (!capabilities.adAccountSelected) {
    blocking.push('Ad account is not selected');
  }
  if (!capabilities.facebookPageSelected) {
    blocking.push('Facebook Page is not selected');
  }

  return blocking;
}

export function isMetaPublishReady(capabilities: StoreCapabilityInput): boolean {
  return getMetaPublishBlockingReasons(capabilities).length === 0;
}

/**
 * Store-level advertising readiness for Advertising Configuration UI / health.
 * Still reflects Meta destination completeness; AI generation uses
 * {@link isGenerationReady} instead.
 */
export function getAdvertisingBlockingReasons(
  capabilities: StoreCapabilityInput,
): string[] {
  const blocking: string[] = [];

  if (!capabilities.shopifyConnected) {
    blocking.push('Shopify is not connected');
  }
  if (!capabilities.productsSynced) {
    blocking.push('Products are not synced');
  }

  blocking.push(...getMetaPublishBlockingReasons(capabilities));

  return blocking;
}

/** Required gates for Meta advertising destinations. Always computed — never stored. */
export function isAdvertisingReady(capabilities: StoreCapabilityInput): boolean {
  return getAdvertisingBlockingReasons(capabilities).length === 0;
}

export function computeStoreHealth(capabilities: StoreCapabilityInput): {
  status: StoreHealthStatus;
  reasons: string[];
} {
  const generationBlocking = getGenerationBlockingReasons(capabilities);
  const publishBlocking = getMetaPublishBlockingReasons(capabilities);

  if (generationBlocking.length > 0) {
    return {
      status: 'NOT_READY',
      reasons: [...generationBlocking, ...publishBlocking],
    };
  }

  if (publishBlocking.length > 0) {
    return {
      status: 'NEEDS_ATTENTION',
      reasons: publishBlocking,
    };
  }

  return {
    status: 'HEALTHY',
    reasons: [
      'Shopify connected',
      'Products synced',
      'Meta connected',
      'Everything ready',
    ],
  };
}
