import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { Request, Response } from 'express';

import { AuditService } from './audit/audit.service';
import {
  CORRELATION_ID_HEADER,
  createCorrelationId,
} from './http/correlation-id';
import { GlobalExceptionFilter } from './http/filters/global-exception.filter';
import { ApiResponseInterceptor } from './http/interceptors/api-response.interceptor';
import { AuthThrottlerGuard } from './rate-limit/auth-throttler.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (request: Request, response: Response) => {
          const correlationId = createCorrelationId(request);
          response.setHeader(CORRELATION_ID_HEADER, correlationId);
          return correlationId;
        },
        customAttributeKeys: {
          reqId: 'requestId',
          responseTime: 'durationMs',
        },
        customSuccessObject: (request, response) => ({
          method: request.method,
          path: request.url,
          statusCode: response.statusCode,
          requestId: request.id,
        }),
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.getOrThrow<number>('AUTH_RATE_TTL_MS'),
            limit: configService.getOrThrow<number>('AUTH_RATE_LIMIT'),
          },
        ],
      }),
    }),
  ],
  providers: [
    AuditService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthThrottlerGuard,
    },
  ],
  exports: [AuditService],
})
export class PlatformInfrastructureModule {}
