import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { ShopifyController } from './controllers/shopify.controller';

import { ShopifyService } from './services/shopify.service';
import { ShopifyApiService } from './services/shopify-api.service';
import { ShopifyProductsService } from './services/shopify-products.service';

@Module({
  imports: [
    HttpModule,
    AuditLogsModule,
  ],

  controllers: [
    ShopifyController,
  ],

  providers: [
    ShopifyService,
    ShopifyApiService,
    ShopifyProductsService,
  ],

  exports: [
    ShopifyService,
    ShopifyProductsService,
  ],
})
export class ShopifyModule {}