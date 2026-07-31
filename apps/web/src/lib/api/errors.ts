import axios, { AxiosError } from "axios";
import type { ApiErrorPayload, ApiValidationIssue } from "@/types/api";
import type { PublishDiagnostics } from "@/features/publisher/types/publisher.types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly correlationId?: string;
  public readonly platform?: string;
  public readonly title?: string;
  public readonly validationCode?: string;
  public readonly issues?: ApiValidationIssue[];
  public readonly diagnostics?: PublishDiagnostics;
  public readonly publishStatus?: string;

  constructor(
    message: string,
    statusCode: number,
    options?: {
      correlationId?: string;
      platform?: string;
      title?: string;
      validationCode?: string;
      issues?: ApiValidationIssue[];
      diagnostics?: PublishDiagnostics;
      publishStatus?: string;
    },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.correlationId = options?.correlationId;
    this.platform = options?.platform;
    this.title = options?.title;
    this.validationCode = options?.validationCode;
    this.issues = options?.issues;
    this.diagnostics = options?.diagnostics;
    this.publishStatus = options?.publishStatus;
  }
}

export function mapApiError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) {
    return new AppError("Unexpected error", 500);
  }

  const axiosError = error as AxiosError<ApiErrorPayload>;
  const statusCode = axiosError.response?.status ?? 0;
  const payload = axiosError.response?.data;

  if (!axiosError.response) {
    const isTimeout =
      axiosError.code === "ECONNABORTED" ||
      /timeout/i.test(axiosError.message);
    return new AppError(
      isTimeout
        ? "The request timed out. Please try again."
        : "Unable to reach the API. Check that the backend is running and reachable.",
      isTimeout ? 504 : 503,
    );
  }

  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : payload?.message ?? axiosError.message;

  const issues = Array.isArray(payload?.issues) ? payload.issues : undefined;
  const diagnostics =
    payload?.diagnostics && typeof payload.diagnostics === "object"
      ? (payload.diagnostics as PublishDiagnostics)
      : undefined;

  return new AppError(message, statusCode || 500, {
    correlationId: payload?.correlationId,
    platform: typeof payload?.platform === "string" ? payload.platform : undefined,
    title: typeof payload?.title === "string" ? payload.title : undefined,
    validationCode:
      typeof payload?.validationCode === "string" ? payload.validationCode : undefined,
    issues,
    diagnostics,
    publishStatus: typeof payload?.status === "string" ? payload.status : undefined,
  });
}
