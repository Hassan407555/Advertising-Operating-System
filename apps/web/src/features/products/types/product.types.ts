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
  brand: string | null;
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

export interface StoreProductVariant {
  id: string;
  externalId: string;
  title: string | null;
  sku: string | null;
  barcode: string | null;
  price: string | null;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  isDefault: boolean;
}

export interface StoreProductImage {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  displayOrder: number;
}

export interface StoreProductDetail extends StoreProduct {
  price: string | null;
  compareAtPrice: string | null;
  inventory: number | null;
  variants: StoreProductVariant[];
  images: StoreProductImage[];
  collections: string[];
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

export type GenerateCampaignProgressStep =
  | "idle"
  | "creating_session"
  | "completing_interview"
  | "generating"
  | "saving_draft"
  | "redirecting";
