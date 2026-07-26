import { Injectable } from '@nestjs/common';

import { PlatformConnectionsService } from '../../platform-connections/services/platform-connections.service';
import { PlatformCredentialsService } from '../../platform-credentials/services/platform-credentials.service';

import { ShopifyApiService } from './shopify-api.service';
import { ShopifyProductsService } from './shopify-products.service';

import { ConnectShopifyDto } from '../dto/connect-shopify.dto';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import type { ShopifySyncResult } from '../interfaces/shopify-sync-result.interface';

@Injectable()
export class ShopifyService {
  constructor(
    private readonly platformConnectionsService: PlatformConnectionsService,
    private readonly platformCredentialsService: PlatformCredentialsService,
    private readonly shopifyApiService: ShopifyApiService,
    private readonly shopifyProductsService: ShopifyProductsService,
  ) {}

  async connect(
    dto: ConnectShopifyDto,
    currentUser: JwtPayload,
  ) {
    throw new Error('Not implemented.');
  }

  async callback(
    code: string,
    shop: string,
    state: string,
  ) {
    throw new Error('Not implemented.');
  }

  async getStore(
    currentUser: JwtPayload,
  ) {
    throw new Error('Not implemented.');
  }

  async disconnect(
    currentUser: JwtPayload,
  ): Promise<void> {
    throw new Error('Not implemented.');
  }

  async syncProducts(
    currentUser: JwtPayload,
  ): Promise<ShopifySyncResult> {
    return this.shopifyProductsService.syncProducts(
      currentUser,
    );
  }
}