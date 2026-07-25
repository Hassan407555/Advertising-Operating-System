import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { AnalyticsController } from './controllers/analytics.controller';

import { AnalyticsService } from './services/analytics.service';

import { AnalyticsMapper } from './mappers/analytics.mapper';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    AnalyticsController,
  ],

  providers: [
    AnalyticsService,
    AnalyticsMapper,
  ],

  exports: [
    AnalyticsService,
    AnalyticsMapper,
  ],
})
export class AnalyticsModule {}