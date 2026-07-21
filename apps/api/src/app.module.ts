import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './infrastructure/config/environment.validation';
import { PlatformInfrastructureModule } from './infrastructure/platform-infrastructure.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PlatformInfrastructureModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    MembershipsModule,
  ],
})
export class AppModule {}