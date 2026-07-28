import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AutomationModule } from '../automation/automation.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativeAssetsModule } from '../creative-assets/creative-assets.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlatformConnectionsModule } from '../platform-connections/platform-connections.module';
import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { SynchronizationModule } from '../synchronization/synchronization.module';

import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

/**
 * Read-only aggregation surface for the Advertising Operating System.
 * Reuses existing domain services; Prisma only where no list/count API exists.
 */
@Module({
  imports: [
    OrganizationsModule,
    CampaignsModule,
    AnalyticsModule,
    CreativeAssetsModule,
    PlatformConnectionsModule,
    PlatformCredentialsModule,
    AutomationModule,
    ShopifyModule,
    SynchronizationModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
