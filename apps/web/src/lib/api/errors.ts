import axios, { AxiosError } from "axios";
import type { ApiErrorPayload } from "@/types/api";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly correlationId?: string;

  constructor(message: string, statusCode: number, correlationId?: string) {
    super(message);
    this.statusCode = statusCode;
    this.correlationId = correlationId;
  }
}

export function mapApiError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) {
    return new AppError("Unexpected error", 500);
  }

  const axiosError = error as AxiosError<ApiErrorPayload>;
  const statusCode = axiosError.response?.status ?? 500;
  const payload = axiosError.response?.data;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : payload?.message ?? axiosError.message;

  return new AppError(message, statusCode, payload?.correlationId);
}
