import { Injectable, Logger } from '@nestjs/common';

import {
  META_TEST_FIXTURES,
  META_TEST_OAUTH_CODE,
} from '../../../infrastructure/config/meta-test-mode';
import { META_OAUTH_SCOPES } from '../constants/meta.constants';

import type {
  MetaAdAccount,
  MetaBusiness,
  MetaCatalog,
  MetaInstagramAccount,
  MetaPage,
  MetaPixel,
  MetaTokenResponse,
  MetaUserProfile,
} from './meta-api.service';

/**
 * Local Meta Graph / OAuth simulator — same public surface as MetaApiService.
 * Never calls the Meta Graph API.
 */
@Injectable()
export class MetaApiSimulatorService {
  private readonly logger = new Logger(MetaApiSimulatorService.name);

  async exchangeCodeForShortLivedToken(
    code: string,
  ): Promise<MetaTokenResponse> {
    this.logger.log({
      msg: 'meta.test_mode.token_exchange.short_lived',
      codeIsTest: code === META_TEST_OAUTH_CODE || code.length > 0,
    });
    return {
      accessToken: `${META_TEST_FIXTURES.accessToken}_short`,
      tokenType: 'bearer',
      expiresIn: 3600,
    };
  }

  async exchangeForLongLivedToken(
    _shortLivedToken: string,
  ): Promise<MetaTokenResponse> {
    this.logger.log({ msg: 'meta.test_mode.token_exchange.long_lived' });
    return {
      accessToken: META_TEST_FIXTURES.accessToken,
      tokenType: 'bearer',
      expiresIn: 60 * 24 * 60 * 60,
    };
  }

  async getUserProfile(_accessToken: string): Promise<MetaUserProfile> {
    return {
      id: META_TEST_FIXTURES.userId,
      name: META_TEST_FIXTURES.userName,
    };
  }

  async listBusinesses(_accessToken: string): Promise<MetaBusiness[]> {
    return [
      {
        id: META_TEST_FIXTURES.businessId,
        name: META_TEST_FIXTURES.businessName,
      },
    ];
  }

  async listAdAccounts(
    _accessToken: string,
    _businessId?: string,
  ): Promise<MetaAdAccount[]> {
    return [
      {
        id: META_TEST_FIXTURES.accountId,
        accountId: META_TEST_FIXTURES.accountNumericId,
        name: META_TEST_FIXTURES.accountName,
        currency: 'USD',
        timezoneName: 'America/New_York',
        accountStatus: 1,
      },
    ];
  }

  async listPages(_accessToken: string): Promise<MetaPage[]> {
    return [
      {
        id: META_TEST_FIXTURES.pageId,
        name: META_TEST_FIXTURES.pageName,
        accessToken: `${META_TEST_FIXTURES.accessToken}_page`,
        category: 'Brand',
      },
    ];
  }

  async listInstagramAccounts(
    _accessToken: string,
    pageId?: string,
  ): Promise<MetaInstagramAccount[]> {
    return [
      {
        id: META_TEST_FIXTURES.instagramId,
        username: META_TEST_FIXTURES.instagramUsername,
        name: META_TEST_FIXTURES.instagramUsername,
        pageId: pageId ?? META_TEST_FIXTURES.pageId,
      },
    ];
  }

  async listPixels(
    _accessToken: string,
    _options: { businessId?: string; adAccountId?: string } = {},
  ): Promise<MetaPixel[]> {
    return [
      {
        id: META_TEST_FIXTURES.pixelId,
        name: META_TEST_FIXTURES.pixelName,
      },
    ];
  }

  async listCatalogs(
    _accessToken: string,
    _businessId?: string,
  ): Promise<MetaCatalog[]> {
    return [
      {
        id: META_TEST_FIXTURES.catalogId,
        name: META_TEST_FIXTURES.catalogName,
      },
    ];
  }

  getConfiguredScopes(): string[] {
    return [...META_OAUTH_SCOPES];
  }
}
