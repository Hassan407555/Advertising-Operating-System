import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { ShopifyProductsSyncSummary, ShopifyStoreSyncStatus } from "@/features/shopify/products/types/shopify-products.types";

export async function getShopifyProductSyncStatus() {
  const response = await apiClient.get("/shopify/store");
  return unwrapEnvelope<ShopifyStoreSyncStatus>(response.data);
}

export async function runShopifyProductSync() {
  const response = await apiClient.post("/shopify/sync");
  return unwrapEnvelope<ShopifyProductsSyncSummary>(response.data);
}
