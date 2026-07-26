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
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
        },
      ),
    );

    if (response.data.errors) {
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
