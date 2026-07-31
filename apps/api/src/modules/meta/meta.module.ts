import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { MetaController } from './controllers/meta.controller';
import { MetaService } from './services/meta.service';
import { MetaApiService } from './services/meta-api.service';

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
  providers: [MetaService, MetaApiService],
  exports: [MetaService],
})
export class MetaModule {}
