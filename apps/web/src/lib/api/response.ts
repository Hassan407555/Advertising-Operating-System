import type { ApiEnvelope } from "@/types/api";

export function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  let current: unknown = payload;

  while (current && typeof current === "object" && "data" in (current as Record<string, unknown>)) {
    current = (current as ApiEnvelope<unknown>).data;
  }

  return current as T;
}
