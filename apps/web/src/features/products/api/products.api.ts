import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { AiSession } from "@/features/ai-sessions/types/ai-session.types";
import type {
  StartAdvertisingEntryPayload,
  StoreProductsListQuery,
  StoreProductsListResponse,
} from "@/features/products/types/product.types";

export async function listStoreProducts(
  storeId: string,
  query: StoreProductsListQuery = {},
): Promise<StoreProductsListResponse> {
  const response = await apiClient.get(`/stores/${storeId}/products`, {
    params: query,
  });
  return unwrapEnvelope<StoreProductsListResponse>(response.data);
}

/**
 * AI Campaign Entry — start or resume. Do not call POST /ai-sessions from Products.
 */
export async function startAdvertisingEntry(
  storeId: string,
  payload: StartAdvertisingEntryPayload,
): Promise<AiSession> {
  const response = await apiClient.post(
    `/stores/${storeId}/advertising-entry`,
    payload,
  );
  return unwrapEnvelope<AiSession>(response.data);
}
