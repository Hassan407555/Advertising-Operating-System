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

interface ApiSuccessEnvelope {
  success: true;
  data?: unknown;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const correlationId = getCorrelationId(request);

    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next
      .handle()
      .pipe(
        map((body: unknown) =>
          this.isSuccessEnvelope(body) ? body : { success: true, data: body },
        ),
      );
  }

  private isSuccessEnvelope(body: unknown): body is ApiSuccessEnvelope {
    return (
      typeof body === 'object' &&
      body !== null &&
      'success' in body &&
      body.success === true
    );
  }
}
