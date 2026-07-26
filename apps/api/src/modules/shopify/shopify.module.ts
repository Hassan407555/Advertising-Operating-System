// import { HttpModule } from '@nestjs/axios';
// import { Module } from '@nestjs/common';

// import { PlatformConnectionsModule } from '../platform-connections/platform-connections.module';
// import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';
// import { AuditLogsModule } from '../audit-logs/audit-logs.module';

// import { ShopifyController } from './controllers/shopify.controller';
// import { ShopifyService } from './services/shopify.service';
// import { ShopifyApiService } from './services/shopify-api.service';

// import { ShopifyProductsService } from './services/shopify-products.service';
// @Module({
//   imports: [
//     HttpModule,
//     PlatformConnectionsModule,
//     PlatformCredentialsModule,
//     AuditLogsModule,
//   ],
//   controllers: [ShopifyController],
// providers: [
//   ShopifyService,
//   ShopifyApiService,
//   ShopifyProductsService,
// ],
// })
// export class ShopifyModule {}