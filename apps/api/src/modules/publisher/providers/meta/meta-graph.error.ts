/**
 * Structured Meta Graph API error payload propagated to callers and the UI.
 * Do not strip these fields — they are required for publish diagnostics.
 *
 * Intentionally extends Error (NOT Nest HttpException) so Graph failures are
 * soft-caught by MetaPublisherProvider and returned as PublishResult.diagnostics
 * instead of being converted into a bare HTTP error response.
 */
export interface MetaGraphErrorDetails {
  message: string;
  httpStatus: number;
  code?: number;
  errorSubcode?: number;
  type?: string;
  fbtraceId?: string;
  path?: string;
  raw?: unknown;
}

export class MetaGraphApiException extends Error {
  readonly graph: MetaGraphErrorDetails;
  readonly name = 'MetaGraphApiException';

  constructor(details: MetaGraphErrorDetails) {
    super(formatMetaErrorMessage(details));
    this.graph = details;
  }
}

export function isMetaGraphApiException(
  error: unknown,
): error is MetaGraphApiException {
  return (
    error instanceof MetaGraphApiException ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'MetaGraphApiException' &&
      typeof (error as { graph?: unknown }).graph === 'object' &&
      (error as { graph?: unknown }).graph !== null)
  );
}

export function extractMetaGraphError(
  error: unknown,
): MetaGraphErrorDetails | null {
  if (isMetaGraphApiException(error)) {
    return (error as MetaGraphApiException).graph;
  }

  // Duck-type Nest HttpException / plain objects that already carry Graph fields.
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      graph?: MetaGraphErrorDetails;
      response?: unknown;
      getResponse?: () => unknown;
      getStatus?: () => number;
      message?: string;
    };

    if (candidate.graph && typeof candidate.graph.message === 'string') {
      return candidate.graph;
    }

    const response =
      typeof candidate.getResponse === 'function'
        ? candidate.getResponse()
        : candidate.response;

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const body = response as Record<string, unknown>;
      const message =
        typeof body.message === 'string'
          ? body.message
          : typeof candidate.message === 'string'
            ? candidate.message
            : null;

      const hasGraphShape =
        body.code !== undefined ||
        body.fbtraceId !== undefined ||
        body.fbtrace_id !== undefined ||
        body.errorSubcode !== undefined ||
        body.httpStatus !== undefined;

      if (message && hasGraphShape) {
        return {
          message,
          httpStatus:
            typeof body.httpStatus === 'number'
              ? body.httpStatus
              : typeof candidate.getStatus === 'function'
                ? candidate.getStatus()
                : 502,
          code: typeof body.code === 'number' ? body.code : undefined,
          errorSubcode:
            typeof body.errorSubcode === 'number'
              ? body.errorSubcode
              : typeof body.error_subcode === 'number'
                ? body.error_subcode
                : undefined,
          type: typeof body.type === 'string' ? body.type : undefined,
          fbtraceId:
            typeof body.fbtraceId === 'string'
              ? body.fbtraceId
              : typeof body.fbtrace_id === 'string'
                ? body.fbtrace_id
                : undefined,
          path: typeof body.path === 'string' ? body.path : undefined,
          raw: body.raw ?? body,
        };
      }
    }
  }

  return null;
}

/**
 * Heuristic: rate limits and transient Meta failures are retryable;
 * invalid parameters and auth errors are not.
 */
export function isMetaErrorRetryable(
  details: MetaGraphErrorDetails | null,
): boolean {
  if (!details) {
    return true;
  }

  const code = details.code;
  if (code === undefined) {
    return details.httpStatus >= 500;
  }

  // Transient / rate-limit style codes
  if ([1, 2, 4, 17, 32, 613].includes(code)) {
    return true;
  }

  // Auth / permission / invalid parameter — not retryable without a fix
  if ([10, 100, 190, 200, 294].includes(code)) {
    return false;
  }

  return details.httpStatus >= 500;
}

export function formatMetaErrorMessage(
  details: MetaGraphErrorDetails,
): string {
  if (details.code !== undefined) {
    return `(#${details.code}) ${details.message}`;
  }

  return details.message;
}
