import { Module } from '@nestjs/common';

import { AdAccountsModule } from '../ad-accounts/ad-accounts.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativesModule } from '../creatives/creatives.module';
import { ShopifyModule } from '../shopify/shopify.module';

import { CampaignGeneratorController } from './controllers/campaign-generator.controller';
import { CampaignGeneratorService } from './services/campaign-generator.service';

@Module({
  imports: [
    ShopifyModule,
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    CreativesModule,
    AdAccountsModule,
  ],
  controllers: [CampaignGeneratorController],
  providers: [CampaignGeneratorService],
  exports: [CampaignGeneratorService],
})
export class CampaignGeneratorModule {}
