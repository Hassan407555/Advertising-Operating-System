import { AppError } from "@/lib/api/errors";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check your input and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "We could not find what you were looking for.",
  409: "This action conflicts with the current state. Refresh and try again.",
  422: "Some of the submitted values are invalid.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "A connected service is temporarily unavailable.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

function isTechnicalMessage(message: string) {
  const normalized = message.trim();
  if (!normalized) {
    return true;
  }
  if (/^Internal server error$/i.test(normalized)) {
    return true;
  }
  if (/^Network Error$/i.test(normalized)) {
    return true;
  }
  if (/Exception|Prisma|ECONNREFUSED|ETIMEDOUT|stack|at\s+\w+\s+\(/i.test(normalized)) {
    return true;
  }
  if (normalized.length > 220) {
    return true;
  }
  return false;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof AppError) {
    const statusFallback = STATUS_MESSAGES[error.statusCode];
    if (isTechnicalMessage(error.message)) {
      return statusFallback ?? fallback;
    }
    return error.message || statusFallback || fallback;
  }

  if (error instanceof Error) {
    if (isTechnicalMessage(error.message)) {
      return fallback;
    }
    return error.message || fallback;
  }

  return fallback;
}

/** Prefer publisher diagnostics / validation issues when the API returns them. */
export function getPublishErrorMessage(
  error: unknown,
  fallback = "Publish failed.",
) {
  if (error instanceof AppError) {
    // Prefer business validation titles over raw diagnostics / Graph text.
    if (error.title?.trim() && error.validationCode) {
      return `${error.title.trim()}: ${error.message}`;
    }

    const diagnosticMessage = error.diagnostics?.errorMessage?.trim();
    if (diagnosticMessage) {
      const stage = error.diagnostics?.stage;
      return stage ? `${stage}: ${diagnosticMessage}` : diagnosticMessage;
    }

    const firstIssueMessage = error.issues?.find(
      (issue) => typeof issue?.message === "string" && issue.message.trim(),
    )?.message?.trim();
    if (firstIssueMessage) {
      return firstIssueMessage;
    }
  }

  return getErrorMessage(error, fallback);
}
