import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { validateEnvironment } from './infrastructure/config/environment.validation';
import { EncryptionModule } from './infrastructure/encryption/encryption.module';
import { PlatformInfrastructureModule } from './infrastructure/platform-infrastructure.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AdAccountsModule } from './modules/ad-accounts/ad-accounts.module';
import { AdSetsModule } from './modules/ad-sets/ad-sets.module';
import { AdsModule } from './modules/ads/ads.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CampaignGeneratorModule } from './modules/campaign-generator/campaign-generator.module';
import { AiModule } from './modules/ai/ai.module';
import { AiCopyModule } from './modules/ai-copy/ai-copy.module';
import { PublisherModule } from './modules/publisher/publisher.module';
import { SynchronizationModule } from './modules/synchronization/synchronization.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CreativeAssetsModule } from './modules/creative-assets/creative-assets.module';
import { CreativesModule } from './modules/creatives/creatives.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PlatformConnectionsModule } from './modules/platform-connections/platform-connections.module';
import { PlatformCredentialsModule } from './modules/platform-credentials/platform-credentials.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { StorageModule } from './modules/storage/storage.module';
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
    PlatformConnectionsModule,
    PlatformCredentialsModule,
    MembershipsModule,
    CreativesModule,
    InvitationsModule,
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    AnalyticsModule,
    CreativeAssetsModule,
    StorageModule,
    ReportingModule,
    AutomationModule,
    EncryptionModule,
    ShopifyModule,
    CampaignGeneratorModule,
    AiModule,
    AiCopyModule,
    PublisherModule,
    SynchronizationModule,
    DashboardModule,
    AdAccountsModule,
  ],
})
export class AppModule {}
