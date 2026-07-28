export interface AdvertisingEligibility {
  eligible: boolean;
  reasons: string[];
}

export interface StoreProduct {
  id: string;
  externalId: string;
  title: string;
  handle: string;
  vendor: string | null;
  productType: string | null;
  description: string | null;
  status: string;
  tags: string[];
  featuredImageUrl: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Backend-computed — do not recompute readiness on the client. */
  canAdvertise: boolean;
  activeSessionId: string | null;
}

export interface StoreProductsListResponse {
  data: StoreProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  advertisingEligibility: AdvertisingEligibility;
}

export interface StoreProductsListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StartAdvertisingEntryPayload {
  productId: string;
}
