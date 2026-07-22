import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CORRELATION_ID_HEADER, getCorrelationId } from '../correlation-id';

interface ExceptionResponse {
  message?: string | string[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    console.error('==========================');
    console.error('UNHANDLED EXCEPTION');
    console.error(exception);
    console.error('==========================');

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId = getCorrelationId(request);

    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      message: this.getMessage(exception, status),
      correlationId,
    });
  }

  private getMessage(
    exception: unknown,
    statusCode: number,
  ): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const message = (exceptionResponse as ExceptionResponse).message;

    return message ?? HttpStatus[statusCode] ?? 'Request failed';
  }
}
