import { randomUUID } from 'crypto';
import type { Request } from 'express';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const CORRELATION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function getCorrelationId(request: Request): string {
  const requestId = request.id;
  if (typeof requestId === 'string' && requestId.length > 0) {
    return requestId;
  }

  const headerValue = request.header(CORRELATION_ID_HEADER);
  if (headerValue && CORRELATION_ID_PATTERN.test(headerValue)) {
    return headerValue;
  }

  return randomUUID();
}

export function createCorrelationId(request: Request): string {
  const headerValue = request.header(CORRELATION_ID_HEADER);
  return headerValue && CORRELATION_ID_PATTERN.test(headerValue)
    ? headerValue
    : randomUUID();
}

export { CORRELATION_ID_HEADER };
