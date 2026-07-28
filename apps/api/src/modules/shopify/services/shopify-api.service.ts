import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { SHOPIFY_API_VERSION } from '../constants/shopify.constants';
import { SHOPIFY_PRODUCTS_QUERY } from '../graphql/product.query';

import { ShopifyProductsResponse } from '../interfaces/shopify-product.interface';

@Injectable()
export class ShopifyApiService {
  private readonly logger = new Logger(ShopifyApiService.name);

  constructor(
    private readonly http: HttpService,
  ) {}

  async exchangeAccessToken(
    shop: string,
    code: string,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{
        access_token: string;
      }>(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret:
            process.env.SHOPIFY_CLIENT_SECRET,
          code,
        },
      ),
    );

    if (!response.data?.access_token) {
      throw new BadRequestException(
        'Unable to obtain Shopify access token.',
      );
    }

    return response.data.access_token;
  }

  async getShop(
    shop: string,
    accessToken: string,
  ): Promise<{
    id: string;
    name: string;
    domain: string;
    email: string;
  }> {
    const response = await firstValueFrom(
      this.http.get(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token':
              accessToken,
          },
        },
      ),
    );

    const data = response.data.shop;

    return {
      id: String(data.id),
      name: data.name,
      domain: data.domain,
      email: data.email,
    };
  }

  async executeGraphQL<T>(
    shop: string,
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.http.post<{
        data: T;
        errors?: unknown;
      }>(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type':
              'application/json',
            'X-Shopify-Access-Token':
              accessToken,
          },
        },
      ),
    );

   if (response.data.errors) {
  this.logger.error(
    `Shopify GraphQL errors for shop ${shop}`,
  );

  throw new BadRequestException(
    'Shopify GraphQL request failed.',
  );
}

    return response.data.data;
  }

  async getProducts(
    shop: string,
    accessToken: string,
    first = 50,
    after?: string,
  ): Promise<ShopifyProductsResponse> {
    return this.executeGraphQL<ShopifyProductsResponse>(
      shop,
      accessToken,
      SHOPIFY_PRODUCTS_QUERY,
      {
        first,
        after,
      },
    );
  }
}