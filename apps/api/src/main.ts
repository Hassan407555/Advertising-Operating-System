import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = app.get(PinoLogger);

  app.enableShutdownHooks();
  app.useLogger(logger);
  app.setGlobalPrefix('api');

  app.use(helmet());

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
