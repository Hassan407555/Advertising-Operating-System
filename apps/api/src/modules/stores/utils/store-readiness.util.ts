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
}

/** Blocking reasons that prevent AI advertising. Always computed — never stored. */
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
  if (!capabilities.metaConnected) {
    blocking.push('Meta is not connected');
  }
  if (!capabilities.adAccountSelected) {
    blocking.push('Ad account is not selected');
  }

  return blocking;
}

/** Required gates for AI advertising. Always computed — never stored. */
export function isAdvertisingReady(capabilities: StoreCapabilityInput): boolean {
  return getAdvertisingBlockingReasons(capabilities).length === 0;
}

export function computeStoreHealth(capabilities: StoreCapabilityInput): {
  status: StoreHealthStatus;
  reasons: string[];
} {
  const blocking = getAdvertisingBlockingReasons(capabilities);
  const attention: string[] = [];

  if (capabilities.metaConnected && !capabilities.facebookPageSelected) {
    attention.push('Facebook Page is missing');
  }
  if (capabilities.metaConnected && !capabilities.instagramSelected) {
    attention.push('Instagram is missing');
  }
  if (capabilities.metaConnected && !capabilities.pixelSelected) {
    attention.push('Pixel is missing');
  }
  if (capabilities.metaConnected && !capabilities.catalogSelected) {
    attention.push('Catalog is missing');
  }

  if (blocking.length > 0) {
    return { status: 'NOT_READY', reasons: [...blocking, ...attention] };
  }

  if (attention.length > 0) {
    return { status: 'NEEDS_ATTENTION', reasons: attention };
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
