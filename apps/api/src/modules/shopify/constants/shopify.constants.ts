import { PlatformType } from '@prisma/client';
export const SHOPIFY_API_VERSION = '2025-01';

export const SHOPIFY_SCOPES = [
  'read_products',
];

export const SHOPIFY_DEFAULT_LIMIT = 20;

export const SHOPIFY_DEFAULT_PAGE = 1;

export const SHOPIFY_GRAPHQL_ENDPOINT = (
  shop: string,
) =>
  `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

export const SHOPIFY_TOKEN_ENDPOINT = (
  shop: string,
) =>
  `https://${shop}/admin/oauth/access_token`;

export const SHOPIFY_AUTHORIZE_ENDPOINT = (
  shop: string,
) =>
  `https://${shop}/admin/oauth/authorize`;