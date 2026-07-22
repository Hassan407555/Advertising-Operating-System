import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { validateEnvironment } from './infrastructure/config/environment.validation';
import { PlatformInfrastructureModule } from './infrastructure/platform-infrastructure.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PlatformConnectionsModule } from './modules/platform-connections/platform-connections.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { InvitationsModule } from './modules/invitations/invitations.module';

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
    PlatformConnectionsModule,
    MembershipsModule,
    InvitationsModule,
    CampaignsModule,   // 👈 Add this
  ],
})
export class AppModule {}
