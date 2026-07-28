export interface ShopifyProductsSyncSummary {
  products: number;
  variants: number;
  images: number;
  duration: number;
}

export interface ShopifyStoreSyncStatus {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  shop: string;
  status: string;
  syncStatus: string;
  connected: boolean;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}
