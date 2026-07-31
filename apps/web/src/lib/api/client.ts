import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/api/env";
import { mapApiError } from "@/lib/api/errors";
import { unwrapEnvelope } from "@/lib/api/response";
import { readTokens, writeTokens } from "@/lib/auth/token-storage";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const REFRESH_ENDPOINT = "/auth/refresh";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();

  if (!tokens?.refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = apiClient
      .post(REFRESH_ENDPOINT, { refreshToken: tokens.refreshToken })
      .then((response) => {
        const data = unwrapEnvelope<{ tokens: { accessToken: string; refreshToken: string } }>(
          response.data,
        );
        writeTokens(data.tokens);
        return data.tokens.accessToken;
      })
      .catch(() => {
        writeTokens(null);
        unauthorizedHandler?.();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const tokens = readTokens();
  const nextConfig = config;

  if (tokens?.accessToken) {
    nextConfig.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    typeof nextConfig.url === "string" &&
    nextConfig.url.includes("/publisher/publish")
  ) {
    const finalUrl = apiClient.getUri(nextConfig);
    console.info("[apiClient][publish] runtime diagnostics", {
      envBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      axiosBaseURL: apiClient.defaults.baseURL,
      requestBaseURL: nextConfig.baseURL,
      requestUrl: nextConfig.url,
      finalUrl,
    });
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = requestConfig?.url?.endsWith(REFRESH_ENDPOINT);

    if (status === 401 && requestConfig && !requestConfig._retry && !isRefreshCall) {
      requestConfig._retry = true;
      const token = await refreshAccessToken();

      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
        return apiClient(requestConfig);
      }
    }

    return Promise.reject(mapApiError(error));
  },
);

export { apiClient };
