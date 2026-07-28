import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { ConnectShopifyPayload, ConnectShopifyResponse, ShopifyConnection } from "@/features/shopify/types/shopify.types";

export async function connectShopify(payload: ConnectShopifyPayload) {
  const response = await apiClient.post("/shopify/connect", payload);
  return unwrapEnvelope<ConnectShopifyResponse>(response.data);
}

export async function getShopifyStore() {
  const response = await apiClient.get("/shopify/store");
  return unwrapEnvelope<ShopifyConnection>(response.data);
}

export async function disconnectShopifyStore() {
  await apiClient.delete("/shopify/disconnect");
}
