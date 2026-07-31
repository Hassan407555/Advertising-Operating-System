import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CORRELATION_ID_HEADER, getCorrelationId } from '../correlation-id';

interface ExceptionResponse {
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `Request failed (${status}) on ${request.method} ${request.originalUrl}`,
      );
    }

    const correlationId = getCorrelationId(request);
    const details = this.getExceptionDetails(exception);

    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      message: this.getMessage(exception, status),
      correlationId,
      ...details,
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

  /**
   * Preserve extra fields from object HttpException responses
   * (e.g. PublisherService validation: platform + issues).
   */
  private getExceptionDetails(
    exception: unknown,
  ): Record<string, unknown> {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const exceptionResponse = exception.getResponse();
    if (
      typeof exceptionResponse !== 'object' ||
      exceptionResponse === null ||
      Array.isArray(exceptionResponse)
    ) {
      return {};
    }

    const {
      message: _message,
      statusCode: _statusCode,
      error: _error,
      ...details
    } = exceptionResponse as ExceptionResponse & Record<string, unknown>;

    return details;
  }
}
