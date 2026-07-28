export type ShopifyConnectionStatus = string;
export type ShopifySyncStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED" | "PENDING" | "SYNCED" | string;

export interface ShopifyConnection {
  id: string;
  platform: "SHOPIFY" | string;
  accountId: string;
  accountName: string;
  shop: string;
  status: ShopifyConnectionStatus;
  syncStatus: ShopifySyncStatus;
  connected: boolean;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectShopifyPayload {
  shopDomain: string;
}

export interface ConnectShopifyResponse {
  authorizationUrl: string;
}
