import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  Store,
  StoreAdvertisingConfiguration,
  UpsertStoreAdvertisingConfigurationPayload,
} from "@/features/stores/types/store.types";

/**
 * Lists Shopify stores for the current organization with computed capabilities/health.
 */
export async function listStores(): Promise<Store[]> {
  const response = await apiClient.get("/stores");
  return unwrapEnvelope<Store[]>(response.data);
}

export async function getStore(storeId: string): Promise<Store> {
  const response = await apiClient.get(`/stores/${storeId}`);
  return unwrapEnvelope<Store>(response.data);
}

export async function getStoreAdvertisingConfiguration(
  storeId: string,
): Promise<StoreAdvertisingConfiguration | null> {
  const response = await apiClient.get(`/stores/${storeId}/advertising-configuration`);
  return unwrapEnvelope<StoreAdvertisingConfiguration | null>(response.data);
}

export async function upsertStoreAdvertisingConfiguration(
  storeId: string,
  payload: UpsertStoreAdvertisingConfigurationPayload,
): Promise<StoreAdvertisingConfiguration> {
  const response = await apiClient.put(`/stores/${storeId}/advertising-configuration`, payload);
  return unwrapEnvelope<StoreAdvertisingConfiguration>(response.data);
}
