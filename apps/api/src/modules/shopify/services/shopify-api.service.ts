import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { SHOPIFY_API_VERSION } from '../constants/shopify.constants';
import { SHOPIFY_PRODUCTS_QUERY } from '../graphql/product.query';

import { ShopifyProductsResponse } from '../interfaces/shopify-product.interface';

@Injectable()
export class ShopifyApiService {
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

    console.log(
  JSON.stringify(response.data, null, 2),
);

   if (response.data.errors) {
  console.error(
    'Shopify GraphQL Errors:',
    JSON.stringify(response.data.errors, null, 2),
  );

  throw new BadRequestException(
    JSON.stringify(response.data.errors),
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