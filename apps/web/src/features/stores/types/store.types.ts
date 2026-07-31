/**
 * Product-facing store model.
 * Backed by Shopify PlatformConnection records internally — never expose that term in UI.
 */

export type StoreHealthStatus = "HEALTHY" | "NEEDS_ATTENTION" | "NOT_READY";

export interface StoreCapabilities {
  shopifyConnected: boolean;
  metaConnected: boolean;
  productsSynced: boolean;
  productCount: number;
  lastSyncAt: string | null;
  adAccountSelected: boolean;
  businessManagerSelected?: boolean;
  facebookPageSelected: boolean;
  instagramSelected: boolean;
  pixelSelected: boolean;
  catalogSelected: boolean;
}

export interface StoreHealth {
  status: StoreHealthStatus;
  reasons: string[];
}

export interface Store {
  id: string;
  organizationId: string;
  name: string;
  shopDomain: string;
  status: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  capabilities?: StoreCapabilities;
  /** Computed — never persisted. */
  advertisingReady?: boolean;
  health?: StoreHealth;
}

export interface StoreAdvertisingConfiguration {
  id: string;
  organizationId: string;
  shopifyStoreId: string;
  metaPlatformConnectionId: string | null;
  metaBusinessId: string | null;
  adAccountId: string | null;
  facebookPageId: string | null;
  instagramAccountId: string | null;
  pixelId: string | null;
  catalogId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertStoreAdvertisingConfigurationPayload {
  metaPlatformConnectionId?: string | null;
  metaBusinessId?: string | null;
  adAccountId?: string | null;
  facebookPageId?: string | null;
  instagramAccountId?: string | null;
  pixelId?: string | null;
  catalogId?: string | null;
}
