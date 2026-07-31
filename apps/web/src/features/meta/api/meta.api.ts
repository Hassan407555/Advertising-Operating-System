import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import type {
  ConnectMetaPayload,
  ConnectMetaResponse,
  MetaBusiness,
  MetaCatalog,
  MetaConnection,
  MetaInstagramAccount,
  MetaPage,
  MetaPixel,
  MetaRemoteAdAccount,
} from "@/features/meta/types/meta.types";

export async function connectMeta(payload: ConnectMetaPayload = {}) {
  const response = await apiClient.post("/meta/connect", payload);
  return unwrapEnvelope<ConnectMetaResponse>(response.data);
}

export async function getMetaConnection(): Promise<MetaConnection | null> {
  try {
    const response = await apiClient.get("/meta/connection/status");
    return unwrapEnvelope<MetaConnection>(response.data);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

function asResourceArray<T>(value: unknown): T[] {
  // Guard against empty 304/cache responses being treated as successful data.
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function listMetaBusinesses() {
  const response = await apiClient.get("/meta/businesses");
  return asResourceArray<MetaBusiness>(unwrapEnvelope(response.data));
}

export async function listMetaAdAccounts(businessId?: string) {
  const response = await apiClient.get("/meta/ad-accounts", {
    params: businessId ? { businessId } : undefined,
  });
  return asResourceArray<MetaRemoteAdAccount>(unwrapEnvelope(response.data));
}

export async function listMetaPages() {
  const response = await apiClient.get("/meta/pages");
  return asResourceArray<MetaPage>(unwrapEnvelope(response.data));
}

export async function listMetaInstagramAccounts(pageId?: string) {
  const response = await apiClient.get("/meta/instagram-accounts", {
    params: pageId ? { pageId } : undefined,
  });
  return asResourceArray<MetaInstagramAccount>(unwrapEnvelope(response.data));
}

export async function listMetaPixels(options?: {
  businessId?: string;
  adAccountId?: string;
}) {
  const response = await apiClient.get("/meta/pixels", {
    params: {
      ...(options?.businessId ? { businessId: options.businessId } : {}),
      ...(options?.adAccountId ? { adAccountId: options.adAccountId } : {}),
    },
  });
  return asResourceArray<MetaPixel>(unwrapEnvelope(response.data));
}

export async function listMetaCatalogs(businessId?: string) {
  const response = await apiClient.get("/meta/catalogs", {
    params: businessId ? { businessId } : undefined,
  });
  return asResourceArray<MetaCatalog>(unwrapEnvelope(response.data));
}

export async function disconnectMeta() {
  await apiClient.delete("/meta/disconnect");
}
