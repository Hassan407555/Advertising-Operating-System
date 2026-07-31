import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  getMetaGraphUrl,
  META_OAUTH_SCOPES,
} from '../constants/meta.constants';

export type MetaTokenResponse = {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export type MetaUserProfile = {
  id: string;
  name: string;
};

export type MetaBusiness = {
  id: string;
  name: string;
};

export type MetaAdAccount = {
  id: string;
  accountId: string;
  name: string;
  currency?: string;
  timezoneName?: string;
  accountStatus?: number;
};

export type MetaPage = {
  id: string;
  name: string;
  accessToken?: string;
  category?: string;
};

export type MetaInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  pageId?: string;
};

export type MetaPixel = {
  id: string;
  name: string;
};

export type MetaCatalog = {
  id: string;
  name: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);

  constructor(private readonly http: HttpService) {}

  async exchangeCodeForShortLivedToken(
    code: string,
  ): Promise<MetaTokenResponse> {
    const appId = this.requireEnv('META_APP_ID');
    const appSecret = this.requireEnv('META_APP_SECRET');
    const redirectUri = this.requireEnv('META_REDIRECT_URI');

    const url = getMetaGraphUrl('oauth/access_token');
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    this.logger.log({
      msg: 'meta.oauth.token_exchange.short_lived.request',
      redirectUri,
      endpoint: url,
    });

    return this.fetchToken(url, body, 'short-lived access token');
  }

  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<MetaTokenResponse> {
    const appId = this.requireEnv('META_APP_ID');
    const appSecret = this.requireEnv('META_APP_SECRET');

    const url = getMetaGraphUrl('oauth/access_token');
    const body = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    this.logger.log({
      msg: 'meta.oauth.token_exchange.long_lived.request',
      endpoint: url,
    });

    return this.fetchToken(url, body, 'long-lived access token');
  }

  async getUserProfile(accessToken: string): Promise<MetaUserProfile> {
    const data = await this.graphGet<{ id: string; name: string }>(
      'me',
      accessToken,
      { fields: 'id,name' },
    );

    if (!data.id) {
      throw new BadRequestException('Unable to resolve Meta user profile.');
    }

    return {
      id: String(data.id),
      name: data.name || `Meta User ${data.id}`,
    };
  }

  async listBusinesses(accessToken: string): Promise<MetaBusiness[]> {
    const data = await this.graphGet<{
      data?: Array<{ id: string; name?: string }>;
    }>('me/businesses', accessToken, {
      fields: 'id,name',
      limit: '100',
    });

    return (data.data ?? []).map((item) => ({
      id: String(item.id),
      name: item.name || item.id,
    }));
  }

  async listAdAccounts(
    accessToken: string,
    businessId?: string,
  ): Promise<MetaAdAccount[]> {
    if (businessId) {
      const [owned, client] = await Promise.all([
        this.listBusinessAdAccounts(
          accessToken,
          businessId,
          'owned_ad_accounts',
        ),
        this.listBusinessAdAccounts(
          accessToken,
          businessId,
          'client_ad_accounts',
        ),
      ]);

      const byId = new Map<string, MetaAdAccount>();
      for (const account of [...owned, ...client]) {
        byId.set(account.id, account);
      }
      return [...byId.values()];
    }

    const data = await this.graphGet<{
      data?: Array<{
        id: string;
        account_id?: string;
        name?: string;
        currency?: string;
        timezone_name?: string;
        account_status?: number;
      }>;
    }>('me/adaccounts', accessToken, {
      fields: 'id,account_id,name,currency,timezone_name,account_status',
      limit: '100',
    });

    return (data.data ?? []).map((item) => this.mapAdAccount(item));
  }

  async listPages(accessToken: string): Promise<MetaPage[]> {
    const data = await this.graphGet<{
      data?: Array<{
        id: string;
        name?: string;
        access_token?: string;
        category?: string;
      }>;
    }>('me/accounts', accessToken, {
      fields: 'id,name,access_token,category',
      limit: '100',
    });

    return (data.data ?? []).map((item) => ({
      id: String(item.id),
      name: item.name || item.id,
      accessToken: item.access_token,
      category: item.category,
    }));
  }

  /**
   * Instagram accounts linked to a Page, or discovered via the user's Pages.
   */
  async listInstagramAccounts(
    accessToken: string,
    pageId?: string,
  ): Promise<MetaInstagramAccount[]> {
    if (pageId) {
      return this.listPageInstagramAccounts(accessToken, pageId);
    }

    const pages = await this.listPages(accessToken);
    const byId = new Map<string, MetaInstagramAccount>();

    await Promise.all(
      pages.map(async (page) => {
        const accounts = await this.listPageInstagramAccounts(
          accessToken,
          page.id,
          page.accessToken,
        );
        for (const account of accounts) {
          byId.set(account.id, account);
        }
      }),
    );

    return [...byId.values()];
  }

  async listPixels(
    accessToken: string,
    options: { businessId?: string; adAccountId?: string } = {},
  ): Promise<MetaPixel[]> {
    const byId = new Map<string, MetaPixel>();

    if (options.adAccountId) {
      const actId = options.adAccountId.startsWith('act_')
        ? options.adAccountId
        : `act_${options.adAccountId}`;
      for (const pixel of await this.listAdAccountPixels(accessToken, actId)) {
        byId.set(pixel.id, pixel);
      }
    }

    if (options.businessId) {
      const [owned, client] = await Promise.all([
        this.listBusinessEdgePixels(
          accessToken,
          options.businessId,
          'owned_pixels',
        ),
        this.listBusinessEdgePixels(
          accessToken,
          options.businessId,
          'client_pixels',
        ),
      ]);
      for (const pixel of [...owned, ...client]) {
        byId.set(pixel.id, pixel);
      }
    }

    if (byId.size === 0 && !options.adAccountId && !options.businessId) {
      const accounts = await this.listAdAccounts(accessToken);
      for (const account of accounts.slice(0, 20)) {
        for (const pixel of await this.listAdAccountPixels(
          accessToken,
          account.id,
        )) {
          byId.set(pixel.id, pixel);
        }
      }
    }

    return [...byId.values()];
  }

  async listCatalogs(
    accessToken: string,
    businessId?: string,
  ): Promise<MetaCatalog[]> {
    if (!businessId) {
      const businesses = await this.listBusinesses(accessToken);
      const byId = new Map<string, MetaCatalog>();
      for (const business of businesses) {
        for (const catalog of await this.listBusinessCatalogs(
          accessToken,
          business.id,
        )) {
          byId.set(catalog.id, catalog);
        }
      }
      return [...byId.values()];
    }

    return this.listBusinessCatalogs(accessToken, businessId);
  }

  getConfiguredScopes(): string[] {
    return [...META_OAUTH_SCOPES];
  }

  private async listPageInstagramAccounts(
    accessToken: string,
    pageId: string,
    pageAccessToken?: string,
  ): Promise<MetaInstagramAccount[]> {
    const token = pageAccessToken || accessToken;
    const accounts: MetaInstagramAccount[] = [];

    try {
      const page = await this.graphGet<{
        instagram_business_account?: {
          id: string;
          username?: string;
          name?: string;
        };
      }>(pageId, token, {
        fields: 'instagram_business_account{id,username,name}',
      });

      if (page.instagram_business_account?.id) {
        accounts.push({
          id: String(page.instagram_business_account.id),
          username: page.instagram_business_account.username,
          name: page.instagram_business_account.name,
          pageId,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Unable to resolve instagram_business_account for page ${pageId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    try {
      const data = await this.graphGet<{
        data?: Array<{ id: string; username?: string; name?: string }>;
      }>(`${pageId}/instagram_accounts`, token, {
        fields: 'id,username,name',
        limit: '50',
      });

      for (const item of data.data ?? []) {
        accounts.push({
          id: String(item.id),
          username: item.username,
          name: item.name,
          pageId,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Unable to list instagram_accounts for page ${pageId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const byId = new Map<string, MetaInstagramAccount>();
    for (const account of accounts) {
      byId.set(account.id, account);
    }
    return [...byId.values()];
  }

  private async listAdAccountPixels(
    accessToken: string,
    adAccountId: string,
  ): Promise<MetaPixel[]> {
    try {
      const data = await this.graphGet<{
        data?: Array<{ id: string; name?: string }>;
      }>(`${adAccountId}/adspixels`, accessToken, {
        fields: 'id,name',
        limit: '100',
      });

      return (data.data ?? []).map((item) => ({
        id: String(item.id),
        name: item.name || `Pixel ${item.id}`,
      }));
    } catch (error) {
      this.logger.warn(
        `Unable to list adspixels for ${adAccountId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private async listBusinessEdgePixels(
    accessToken: string,
    businessId: string,
    edge: 'owned_pixels' | 'client_pixels',
  ): Promise<MetaPixel[]> {
    try {
      const data = await this.graphGet<{
        data?: Array<{ id: string; name?: string }>;
      }>(`${businessId}/${edge}`, accessToken, {
        fields: 'id,name',
        limit: '100',
      });

      return (data.data ?? []).map((item) => ({
        id: String(item.id),
        name: item.name || `Pixel ${item.id}`,
      }));
    } catch (error) {
      this.logger.warn(
        `Unable to list ${edge} for business ${businessId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private async listBusinessCatalogs(
    accessToken: string,
    businessId: string,
  ): Promise<MetaCatalog[]> {
    const [owned, client] = await Promise.all([
      this.listBusinessEdgeCatalogs(
        accessToken,
        businessId,
        'owned_product_catalogs',
      ),
      this.listBusinessEdgeCatalogs(
        accessToken,
        businessId,
        'client_product_catalogs',
      ),
    ]);

    const byId = new Map<string, MetaCatalog>();
    for (const catalog of [...owned, ...client]) {
      byId.set(catalog.id, catalog);
    }
    return [...byId.values()];
  }

  private async listBusinessEdgeCatalogs(
    accessToken: string,
    businessId: string,
    edge: 'owned_product_catalogs' | 'client_product_catalogs',
  ): Promise<MetaCatalog[]> {
    try {
      const data = await this.graphGet<{
        data?: Array<{ id: string; name?: string }>;
      }>(`${businessId}/${edge}`, accessToken, {
        fields: 'id,name',
        limit: '100',
      });

      return (data.data ?? []).map((item) => ({
        id: String(item.id),
        name: item.name || `Catalog ${item.id}`,
      }));
    } catch (error) {
      this.logger.warn(
        `Unable to list ${edge} for business ${businessId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private async listBusinessAdAccounts(
    accessToken: string,
    businessId: string,
    edge: 'owned_ad_accounts' | 'client_ad_accounts',
  ): Promise<MetaAdAccount[]> {
    try {
      const data = await this.graphGet<{
        data?: Array<{
          id: string;
          account_id?: string;
          name?: string;
          currency?: string;
          timezone_name?: string;
          account_status?: number;
        }>;
      }>(`${businessId}/${edge}`, accessToken, {
        fields: 'id,account_id,name,currency,timezone_name,account_status',
        limit: '100',
      });

      return (data.data ?? []).map((item) => this.mapAdAccount(item));
    } catch (error) {
      this.logger.warn(
        `Unable to list ${edge} for business ${businessId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private mapAdAccount(item: {
    id: string;
    account_id?: string;
    name?: string;
    currency?: string;
    timezone_name?: string;
    account_status?: number;
  }): MetaAdAccount {
    const externalId = String(item.id);
    const accountId =
      item.account_id != null
        ? String(item.account_id)
        : externalId.replace(/^act_/, '');

    return {
      id: externalId.startsWith('act_') ? externalId : `act_${accountId}`,
      accountId,
      name: item.name || `Ad Account ${accountId}`,
      currency: item.currency,
      timezoneName: item.timezone_name,
      accountStatus: item.account_status,
    };
  }

  private async fetchToken(
    url: string,
    body: URLSearchParams,
    label: string,
  ): Promise<MetaTokenResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<
          {
            access_token?: string;
            token_type?: string;
            expires_in?: number;
          } & GraphErrorBody
        >(url, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      if (response.data?.error?.message) {
        throw new BadRequestException(
          `Meta ${label} failed: ${response.data.error.message}`,
        );
      }

      if (!response.data?.access_token) {
        throw new BadRequestException(`Unable to obtain Meta ${label}.`);
      }

      this.logger.log({
        msg: 'meta.oauth.token_exchange.completed',
        label,
        hasAccessToken: true,
        expiresIn:
          typeof response.data.expires_in === 'number'
            ? response.data.expires_in
            : null,
      });

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn:
          typeof response.data.expires_in === 'number'
            ? response.data.expires_in
            : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const graphMessage = this.extractAxiosGraphError(error);
      this.logger.error({
        msg: 'meta.oauth.token_exchange.failed',
        label,
        error: graphMessage,
      });

      throw new BadRequestException(
        graphMessage
          ? `Meta ${label} failed: ${graphMessage}`
          : `Unable to obtain Meta ${label}.`,
      );
    }
  }

  private extractAxiosGraphError(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybeAxios = error as {
      response?: {
        data?: GraphErrorBody & { error_description?: string; message?: string };
      };
      message?: string;
    };

    const data = maybeAxios.response?.data;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (typeof data?.error_description === 'string') {
      return data.error_description;
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }

    return maybeAxios.message ?? null;
  }

  private async graphGet<T>(
    path: string,
    accessToken: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(getMetaGraphUrl(path));
    url.searchParams.set('access_token', accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const safeUrl = url
      .toString()
      .replace(/([?&]access_token=)[^&]+/i, '$1[REDACTED]');

    try {
      const response = await firstValueFrom(
        this.http.get<T & GraphErrorBody>(url.toString()),
      );

      const body = response.data;
      const resourceCount = this.countGraphResources(body);

      this.logger.log({
        msg: 'meta.graph.get.completed',
        path,
        graphUrl: safeUrl,
        httpStatus: response.status,
        resourceCount,
        body,
      });

      if (
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error?.message
      ) {
        throw new BadRequestException(
          `Meta Graph API error: ${body.error.message}`,
        );
      }

      return body;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const graphMessage = this.extractAxiosGraphError(error);
      const axiosStatus =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number; data?: unknown } }).response
          ? (error as { response?: { status?: number; data?: unknown } })
              .response
          : undefined;

      this.logger.error({
        msg: 'meta.graph.get.failed',
        path,
        graphUrl: safeUrl,
        httpStatus: axiosStatus?.status ?? null,
        body: axiosStatus?.data ?? null,
        resourceCount: 0,
        error: graphMessage,
      });

      throw new BadRequestException(
        graphMessage
          ? `Meta Graph API error: ${graphMessage}`
          : `Meta Graph API request failed for ${path}.`,
      );
    }
  }

  private countGraphResources(body: unknown): number {
    if (!body || typeof body !== 'object') {
      return 0;
    }

    const record = body as { data?: unknown };
    if (Array.isArray(record.data)) {
      return record.data.length;
    }

    return 0;
  }

  private requireEnv(key: string): string {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new BadRequestException(`${key} is not configured.`);
    }
    return value;
  }
}
