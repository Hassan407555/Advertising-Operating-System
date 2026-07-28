import type { ApiEnvelope } from "@/types/api";

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.success === "boolean" && "data" in record;
}

export function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  let current: unknown = payload;

  // Only peel true API envelopes ({ success, data }).
  // Paginated payloads also have a `data` field and must not be unwrapped again.
  while (isApiEnvelope(current)) {
    current = current.data;
  }

  return current as T;
}
