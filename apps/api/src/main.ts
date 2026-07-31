import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AppModule } from './app.module';

async function bootstrap() {
  console.log('process.cwd() =', process.cwd());
  console.log('__dirname =', __dirname);
  console.log('META_APP_ID =', process.env.META_APP_ID);

  const nestDefaultEnvPath = resolve(process.cwd(), '.env');
  console.log('Nest default envFilePath =', nestDefaultEnvPath);
  console.log('Nest default envFilePath exists =', existsSync(nestDefaultEnvPath));
  if (existsSync(nestDefaultEnvPath)) {
    const match = readFileSync(nestDefaultEnvPath, 'utf8').match(
      /^META_APP_ID=(.*)$/m,
    );
    console.log(
      'Nest default envFilePath META_APP_ID line =',
      match?.[1]?.trim() ?? '(not found)',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  console.log(
    'after NestFactory.create ConfigService META_APP_ID =',
    configService.get('META_APP_ID'),
  );
  console.log(
    'after NestFactory.create process.env.META_APP_ID =',
    process.env.META_APP_ID,
  );
  const logger = app.get(PinoLogger);

  app.enableShutdownHooks();
  app.useLogger(logger);
  app.setGlobalPrefix('api');

  // Serve local Storage files at STORAGE_LOCAL_PUBLIC_BASE_URL (default /storage).
  // Needed so generated VIDEO CreativeAssets are previewable and Meta file_url-capable
  // when a public base URL is configured.
  const storageRoot = resolve(
    configService.get<string>(
      'STORAGE_LOCAL_ROOT_DIRECTORY',
      './storage',
    ),
  );
  const storagePublicBaseUrl = configService.get<string>(
    'STORAGE_LOCAL_PUBLIC_BASE_URL',
    '/storage',
  );
  app.useStaticAssets(storageRoot, {
    prefix: storagePublicBaseUrl.startsWith('/')
      ? storagePublicBaseUrl
      : `/${storagePublicBaseUrl}`,
  });

  // Authenticated JSON APIs must not use Express ETags. Browsers send
  // If-None-Match on refetch; a 304 has an empty body, axios treats it as
  // success, and React Query overwrites good cache with empty data — which
  // empties Meta resource dropdowns after OAuth invalidate/refetch.
  const httpServer = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  httpServer.set?.('etag', false);

  app.use(
    helmet({
      // API is consumed cross-origin by the Next.js app (different port in local).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const swaggerEnabled =
    String(
      configService.get<string | boolean>('SWAGGER_ENABLED', nodeEnv !== 'production'),
    ).toLowerCase() !== 'false';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Meta Ads Studio API')
      .setDescription('Backend API for AI Meta Ads Studio')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);

  logger.log(`API running at http://localhost:${port}/api`);
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
