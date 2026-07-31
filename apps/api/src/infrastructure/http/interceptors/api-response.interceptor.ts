import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CORRELATION_ID_HEADER, getCorrelationId } from '../correlation-id';

/**
 * True API success envelope shape used across the SPA:
 * `{ success: true, data: T }`.
 *
 * Important: Publish soft-failures look like
 * `{ success: false, status, diagnostics, issues, ... }` and MUST be wrapped
 * as `{ success: true, data: <publishResult> }` so the HTTP call stays 2xx and
 * diagnostics are preserved under `data`.
 */
interface ApiSuccessEnvelope {
  success: true;
  data: unknown;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const correlationId = getCorrelationId(request);

    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    // Prevent conditional 304 responses from wiping SPA query caches.
    response.setHeader('Cache-Control', 'no-store');

    return next.handle().pipe(
      map((body: unknown) => {
        if (this.isSuccessEnvelope(body)) {
          return body;
        }

        // Always wrap controller payloads (including publish soft-failures with
        // success: false) so diagnostics / issues remain intact under `data`.
        return { success: true, data: body };
      }),
    );
  }

  private isSuccessEnvelope(body: unknown): body is ApiSuccessEnvelope {
    if (typeof body !== 'object' || body === null) {
      return false;
    }

    const record = body as Record<string, unknown>;
    return record.success === true && 'data' in record;
  }
}
