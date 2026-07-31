import { Logger, Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { isMetaTestMode } from '../../infrastructure/config/meta-test-mode';

import { MetaController } from './controllers/meta.controller';
import { MetaService } from './services/meta.service';
import { MetaApiService } from './services/meta-api.service';
import { MetaApiSimulatorService } from './services/meta-api.simulator.service';

const metaModuleLogger = new Logger('MetaModule');

@Module({
  imports: [
    HttpModule,
    AuditLogsModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [MetaController],
  providers: [
    MetaService,
    {
      provide: MetaApiService,
      useFactory: (http: HttpService) => {
        if (isMetaTestMode()) {
          metaModuleLogger.warn(
            'META_TEST_MODE enabled — using MetaApiSimulatorService (no Graph API / OAuth token calls).',
          );
          return new MetaApiSimulatorService();
        }
        return new MetaApiService(http);
      },
      inject: [HttpService],
    },
  ],
  exports: [MetaService],
})
export class MetaModule {}
