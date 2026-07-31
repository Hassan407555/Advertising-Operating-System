import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  AdAccountStatus,
  AuditAction,
  AuditEntity,
  ConnectionStatus,
  Currency,
  PlatformType,
  Prisma,
  SyncStatus,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import {
  isMetaTestMode,
  META_TEST_OAUTH_CODE,
} from '../../../infrastructure/config/meta-test-mode';
import {
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_TTL_MS,
  getMetaAuthorizeUrl,
} from '../constants/meta.constants';
import { MetaApiService, type MetaAdAccount } from './meta-api.service';

type MetaOAuthStatePayload = {
  organizationId: string;
  userId: string;
  storeId?: string;
  exp: number;
};

type PendingMetaOAuthIntent = MetaOAuthStatePayload;

const SUPPORTED_CURRENCIES = new Set<string>(Object.values(Currency));
const CALLBACK_FILE = 'meta.service.ts';
const CALLBACK_FUNCTION = 'MetaService.callback';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  /**
   * Server-side OAuth intent keyed by userId.
   * Used when Facebook returns `code` without echoing `state` (observed in local callback logs).
   */
  private readonly pendingOAuthByUserId = new Map<string, PendingMetaOAuthIntent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogsService: AuditLogsService,
    private readonly metaApi: MetaApiService,
    private readonly jwtService: JwtService,
  ) {}

  async connect(
    currentUser: JwtPayload,
    storeId?: string,
  ): Promise<{ authorizationUrl: string }> {
    if (storeId) {
      const store = await this.prisma.platformConnection.findFirst({
        where: {
          id: storeId,
          organizationId: currentUser.organizationId,
          platform: PlatformType.SHOPIFY,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!store) {
        throw new BadRequestException(
          'Store was not found for this organization.',
        );
      }
    }

    const appId = this.requireEnv('META_APP_ID');
    const redirectUri = this.requireEnv('META_REDIRECT_URI');
    console.log({
      metaAppId: process.env.META_APP_ID,
      redirectUri: process.env.META_REDIRECT_URI,
    });
    this.logger.log({
      msg: 'meta.oauth.connect.env',
      metaAppId: process.env.META_APP_ID,
      redirectUri: process.env.META_REDIRECT_URI,
      metaTestMode: isMetaTestMode(),
    });
    const intent: PendingMetaOAuthIntent = {
      organizationId: currentUser.organizationId,
      userId: currentUser.sub,
      storeId,
      exp: Date.now() + META_OAUTH_STATE_TTL_MS,
    };

    this.pendingOAuthByUserId.set(currentUser.sub, intent);

    const state = this.createOAuthState(intent);

    // Local test mode: skip Facebook Login and complete via our own callback.
    // Contract stays { authorizationUrl } — frontend navigates the same way.
    const authorizationUrl = isMetaTestMode()
      ? this.buildTestModeAuthorizationUrl(redirectUri, state)
      : `${getMetaAuthorizeUrl()}` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(META_OAUTH_SCOPES.join(','))}` +
        `&response_type=code`;

    console.log('COMPLETE authorizationUrl =', authorizationUrl);
    this.logger.log({
      msg: 'meta.oauth.connect.authorizationUrl',
      authorizationUrl,
      metaTestMode: isMetaTestMode(),
    });

    this.logger.log({
      msg: 'meta.oauth.connect.generated',
      organizationId: currentUser.organizationId,
      userId: currentUser.sub,
      storeId: storeId ?? null,
      redirectUri,
      authorizeHost: isMetaTestMode()
        ? 'meta-test-mode-local-callback'
        : getMetaAuthorizeUrl(),
      hasState: true,
      stateLength: state.length,
      pendingIntentStored: true,
      scopeCount: META_OAUTH_SCOPES.length,
      metaTestMode: isMetaTestMode(),
      authorizationUrlPreview: authorizationUrl.replace(
        /([?&]state=)[^&]+/i,
        '$1[redacted]',
      ),
    });

    return { authorizationUrl };
  }

  /**
   * Completes Meta OAuth and returns the frontend redirect URL.
   */
  async callback(params: {
    code?: string;
    state?: string;
    error?: string;
    errorReason?: string;
    errorDescription?: string;
    queryKeys?: string[];
    accessTokenCookie?: string;
  }): Promise<string> {
    const webAppUrl = this.getWebAppUrl();
    let step = 'callback_entered';

    this.logger.log({
      msg: 'meta.oauth.callback.entered',
      step,
      file: CALLBACK_FILE,
      function: CALLBACK_FUNCTION,
      queryKeys: params.queryKeys ?? [],
      hasCode: Boolean(params.code),
      hasState: Boolean(params.state),
      hasError: Boolean(params.error),
      hasAccessCookie: Boolean(params.accessTokenCookie),
      webAppUrl,
      redirectUri: process.env.META_REDIRECT_URI?.trim() ?? null,
    });

    if (params.error) {
      const message =
        params.errorDescription || params.errorReason || params.error;
      this.logger.warn({
        msg: 'meta.oauth.callback.facebook_error',
        step: 'facebook_error_early_return',
        file: CALLBACK_FILE,
        function: CALLBACK_FUNCTION,
        error: params.error,
        message,
      });
      return this.buildFrontendRedirect(webAppUrl, {
        meta: 'error',
        message,
      });
    }

    if (!params.code) {
      this.logger.warn({
        msg: 'meta.oauth.callback.missing_params',
        step: 'authorization_code_missing_early_return',
        file: CALLBACK_FILE,
        function: CALLBACK_FUNCTION,
        condition: '!params.code',
        conditionResult: true,
        hasCode: false,
        hasState: Boolean(params.state),
        queryKeys: params.queryKeys ?? [],
      });
      return this.buildFrontendRedirect(webAppUrl, {
        meta: 'error',
        message: 'Missing Meta OAuth authorization code.',
      });
    }

    this.logger.log({
      msg: 'meta.oauth.callback.authorization_code_received',
      step: 'authorization_code_received',
      codeLength: params.code.length,
      stateLength: params.state?.length ?? 0,
    });

    try {
      step = 'oauth_context_resolution';
      const decodedState = this.resolveOAuthContext({
        state: params.state,
        accessTokenCookie: params.accessTokenCookie,
      });

      this.logger.log({
        msg: 'meta.oauth.callback.state_verified',
        step: 'oauth_context_resolved',
        organizationId: decodedState.organizationId,
        userId: decodedState.userId,
        storeId: decodedState.storeId ?? null,
        source: decodedState.source,
      });

      step = 'organization_lookup';
      const organization = await this.prisma.organization.findFirst({
        where: { id: decodedState.organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        this.logger.error({
          msg: 'meta.oauth.callback.organization_missing',
          step,
          file: CALLBACK_FILE,
          function: CALLBACK_FUNCTION,
          condition: 'organization == null',
          conditionResult: true,
          organizationId: decodedState.organizationId,
        });
        throw new BadRequestException(
          `Organization ${decodedState.organizationId} was not found for Meta OAuth.`,
        );
      }

      this.logger.log({
        msg: 'meta.oauth.callback.organization_lookup',
        step: 'organization_lookup',
        organizationId: organization.id,
        organizationName: organization.name,
        storeId: decodedState.storeId ?? null,
      });

      step = 'access_token_exchange';
      this.logger.log({
        msg: 'meta.oauth.callback.token_exchange_started',
        step,
        organizationId: decodedState.organizationId,
      });
      const shortLived = await this.metaApi.exchangeCodeForShortLivedToken(
        params.code,
      );
      const longLived = await this.metaApi.exchangeForLongLivedToken(
        shortLived.accessToken,
      );
      this.logger.log({
        msg: 'meta.oauth.callback.token_exchange_completed',
        step: 'access_token_exchange',
        organizationId: decodedState.organizationId,
        hasShortLivedToken: Boolean(shortLived.accessToken),
        hasLongLivedToken: Boolean(longLived.accessToken),
        expiresIn: longLived.expiresIn ?? null,
      });

      step = 'graph_me_request';
      this.logger.log({
        msg: 'meta.oauth.callback.graph_me_started',
        step,
        organizationId: decodedState.organizationId,
      });
      const profile = await this.metaApi.getUserProfile(longLived.accessToken);
      this.logger.log({
        msg: 'meta.oauth.callback.graph_me_completed',
        step: 'graph_me_request',
        organizationId: decodedState.organizationId,
        metaUserId: profile.id,
        hasName: Boolean(profile.name),
      });

      const expiresAt =
        typeof longLived.expiresIn === 'number'
          ? new Date(Date.now() + longLived.expiresIn * 1000)
          : null;

      step = 'encrypt_access_token';
      const encryptedAccessToken = this.encryptionService.encrypt(
        longLived.accessToken,
      );
      this.logger.log({
        msg: 'meta.oauth.callback.token_encrypted',
        step,
        organizationId: decodedState.organizationId,
        encryptedLength: encryptedAccessToken.length,
      });

      const accountName = profile.name.slice(0, 255);

      step = 'database_transaction';
      this.logger.log({
        msg: 'meta.oauth.callback.database_save_started',
        step,
        organizationId: decodedState.organizationId,
        storeId: decodedState.storeId ?? null,
        metaUserId: profile.id,
      });

      const { connection, credentialAction } = await this.prisma.$transaction(
        async (tx) => {
          const upserted = await tx.platformConnection.upsert({
            where: {
              organizationId_platform_accountId: {
                organizationId: decodedState.organizationId,
                platform: PlatformType.META,
                accountId: profile.id,
              },
            },
            create: {
              organizationId: decodedState.organizationId,
              createdByUserId: decodedState.userId,
              platform: PlatformType.META,
              accountId: profile.id,
              accountName,
              externalName: accountName,
              status: ConnectionStatus.ACTIVE,
              syncStatus: SyncStatus.SYNCED,
              metadata: {
                provider: 'meta',
                connectedAt: new Date().toISOString(),
              },
            },
            update: {
              accountName,
              externalName: accountName,
              status: ConnectionStatus.ACTIVE,
              syncStatus: SyncStatus.SYNCED,
              deletedAt: null,
              metadata: {
                provider: 'meta',
                connectedAt: new Date().toISOString(),
              },
              version: { increment: 1 },
            },
          });

          this.logger.log({
            msg: 'meta.oauth.callback.platform_connection_upserted',
            step: 'platform_connection_upsert',
            organizationId: decodedState.organizationId,
            platformConnectionId: upserted.id,
            metaUserId: profile.id,
          });

          const existingCredential = await tx.platformCredential.findFirst({
            where: { platformConnectionId: upserted.id },
            orderBy: { createdAt: 'desc' },
          });

          if (!existingCredential) {
            await tx.platformCredential.create({
              data: {
                platformConnectionId: upserted.id,
                accessToken: encryptedAccessToken,
                refreshToken: null,
                expiresAt,
                scopes: [...META_OAUTH_SCOPES],
                isActive: true,
              },
            });
          } else {
            await tx.platformCredential.update({
              where: { id: existingCredential.id },
              data: {
                accessToken: encryptedAccessToken,
                expiresAt,
                scopes: [...META_OAUTH_SCOPES],
                isActive: true,
                revokedAt: null,
                revokedReason: null,
                rotatedAt: new Date(),
                version: { increment: 1 },
              },
            });
          }

          this.logger.log({
            msg: 'meta.oauth.callback.encrypted_token_saved',
            step: 'encrypted_token_save',
            organizationId: decodedState.organizationId,
            platformConnectionId: upserted.id,
            credentialAction: existingCredential ? 'updated' : 'created',
          });

          return {
            connection: upserted,
            credentialAction: existingCredential ? 'updated' : 'created',
          };
        },
      );

      this.logger.log({
        msg: 'meta.oauth.callback.database_transaction_committed',
        step: 'database_transaction_commit',
        organizationId: decodedState.organizationId,
        platformConnectionId: connection.id,
        credentialAction,
      });

      this.pendingOAuthByUserId.delete(decodedState.userId);

      let adAccountCount = 0;
      try {
        const remoteAdAccounts = await this.metaApi.listAdAccounts(
          longLived.accessToken,
        );
        await this.upsertLocalAdAccounts(
          connection.id,
          decodedState.organizationId,
          remoteAdAccounts,
        );
        adAccountCount = remoteAdAccounts.length;
        this.logger.log({
          msg: 'meta.oauth.callback.account_discovery_completed',
          step: 'account_discovery',
          organizationId: decodedState.organizationId,
          platformConnectionId: connection.id,
          adAccountCount,
          adAccountIds: remoteAdAccounts.slice(0, 20).map((a) => a.id),
        });
      } catch (syncError) {
        // OAuth persistence already succeeded; resource sync can retry later.
        this.logger.warn({
          msg: 'meta.oauth.callback.ad_account_sync_failed',
          platformConnectionId: connection.id,
          organizationId: decodedState.organizationId,
          error:
            syncError instanceof Error ? syncError.message : 'unknown error',
          stack: syncError instanceof Error ? syncError.stack : undefined,
        });
      }

      step = 'store_advertising_configuration_update';
      if (decodedState.storeId) {
        const linked = await this.linkMetaConnectionToStore({
          organizationId: decodedState.organizationId,
          storeId: decodedState.storeId,
          metaPlatformConnectionId: connection.id,
        });
        this.logger.log({
          msg: linked
            ? 'meta.oauth.callback.store_linked'
            : 'meta.oauth.callback.store_link_skipped',
          step,
          organizationId: decodedState.organizationId,
          storeId: decodedState.storeId,
          platformConnectionId: connection.id,
          linked,
        });
      } else {
        this.logger.warn({
          msg: 'meta.oauth.callback.store_link_skipped',
          step,
          organizationId: decodedState.organizationId,
          platformConnectionId: connection.id,
          condition: 'decodedState.storeId is missing',
          conditionResult: true,
        });
      }

      await this.auditLogsService.log({
        organizationId: decodedState.organizationId,
        actorId: decodedState.userId,
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.PLATFORM,
        entityId: connection.id,
        metadata: {
          platform: PlatformType.META,
          accountName: connection.accountName,
          adAccountCount,
        },
      });

      step = 'frontend_redirect';
      const redirectUrl = this.buildFrontendRedirect(webAppUrl, {
        meta: 'connected',
        connectionId: connection.id,
        storeId: decodedState.storeId,
      });

      this.logger.log({
        msg: 'meta.oauth.callback.redirect_frontend',
        step,
        organizationId: decodedState.organizationId,
        storeId: decodedState.storeId ?? null,
        platformConnectionId: connection.id,
        redirectPath: '/advertising',
        metaStatus: 'connected',
      });

      return redirectUrl;
    } catch (error) {
      const exceptionClass =
        error instanceof Error ? error.constructor.name : typeof error;
      const message =
        error instanceof Error ? error.message : 'Meta OAuth callback failed.';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error({
        msg: 'meta.oauth.callback.failed',
        step,
        file: CALLBACK_FILE,
        function: CALLBACK_FUNCTION,
        exceptionClass,
        error: message,
        stack,
      });

      return this.buildFrontendRedirect(webAppUrl, {
        meta: 'error',
        message,
      });
    }
  }

  async getConnection(currentUser: JwtPayload) {
    const connection = await this.findActiveMetaConnection(
      currentUser.organizationId,
    );

    if (!connection) {
      throw new NotFoundException('No Meta connection found.');
    }

    const credential = connection.credentials[0] ?? null;

    return {
      id: connection.id,
      platform: connection.platform,
      accountId: connection.accountId,
      accountName: connection.accountName,
      status: connection.status,
      syncStatus: connection.syncStatus,
      connected: true,
      scopes: credential?.scopes ?? [],
      expiresAt: credential?.expiresAt ?? null,
      lastSyncedAt: connection.lastSyncedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  async listBusinesses(currentUser: JwtPayload) {
    const { accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );
    return this.metaApi.listBusinesses(accessToken);
  }

  async listAdAccounts(currentUser: JwtPayload, businessId?: string) {
    const { connection, accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );

    const remote = await this.metaApi.listAdAccounts(accessToken, businessId);

    const localAccounts = await this.upsertLocalAdAccounts(
      connection.id,
      currentUser.organizationId,
      remote,
    );

    return remote.map((account) => {
      const local = localAccounts.get(account.id);
      return {
        id: account.id,
        accountId: account.accountId,
        name: account.name,
        currency: account.currency ?? null,
        timezoneName: account.timezoneName ?? null,
        accountStatus: account.accountStatus ?? null,
        localAdAccountId: local?.id ?? null,
      };
    });
  }

  async listPages(currentUser: JwtPayload) {
    const { accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );
    const pages = await this.metaApi.listPages(accessToken);
    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category ?? null,
    }));
  }

  async listInstagramAccounts(currentUser: JwtPayload, pageId?: string) {
    const { accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );
    const accounts = await this.metaApi.listInstagramAccounts(
      accessToken,
      pageId,
    );
    return accounts.map((account) => ({
      id: account.id,
      username: account.username ?? null,
      name: account.name ?? null,
      pageId: account.pageId ?? null,
    }));
  }

  async listPixels(
    currentUser: JwtPayload,
    options: { businessId?: string; adAccountId?: string } = {},
  ) {
    const { accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );
    return this.metaApi.listPixels(accessToken, options);
  }

  async listCatalogs(currentUser: JwtPayload, businessId?: string) {
    const { accessToken } = await this.requireActiveAccessToken(
      currentUser.organizationId,
    );
    return this.metaApi.listCatalogs(accessToken, businessId);
  }

  async disconnect(currentUser: JwtPayload): Promise<void> {
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        platform: PlatformType.META,
        deletedAt: null,
      },
    });

    if (!connection) {
      throw new NotFoundException('No Meta connection found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformCredential.updateMany({
        where: {
          platformConnectionId: connection.id,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'Disconnected by user',
          version: { increment: 1 },
        },
      });

      await tx.platformConnection.update({
        where: { id: connection.id },
        data: {
          status: ConnectionStatus.INACTIVE,
          syncStatus: SyncStatus.SYNCED,
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.PLATFORM_DISCONNECTED,
          entity: AuditEntity.PLATFORM,
          entityId: connection.id,
          metadata: {
            platform: PlatformType.META,
            accountName: connection.accountName,
          },
        },
        tx,
      );
    });
  }

  private async linkMetaConnectionToStore(params: {
    organizationId: string;
    storeId: string;
    metaPlatformConnectionId: string;
  }): Promise<boolean> {
    const store = await this.prisma.platformConnection.findFirst({
      where: {
        id: params.storeId,
        organizationId: params.organizationId,
        platform: PlatformType.SHOPIFY,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!store) {
      this.logger.warn({
        msg: 'meta.oauth.callback.store_not_found_for_link',
        file: CALLBACK_FILE,
        function: 'MetaService.linkMetaConnectionToStore',
        condition:
          'store lookup by id+organizationId+SHOPIFY+deletedAt=null returned null',
        conditionResult: true,
        organizationId: params.organizationId,
        storeId: params.storeId,
        platformConnectionId: params.metaPlatformConnectionId,
      });
      return false;
    }

    await this.prisma.storeAdvertisingConfiguration.upsert({
      where: { shopifyStoreId: store.id },
      create: {
        organizationId: params.organizationId,
        shopifyStoreId: store.id,
        metaPlatformConnectionId: params.metaPlatformConnectionId,
      },
      update: {
        metaPlatformConnectionId: params.metaPlatformConnectionId,
      },
    });

    return true;
  }

  /**
   * Resolves OAuth org/user/store context from signed state, or falls back to
   * the session cookie + pending connect intent when Facebook omits `state`.
   */
  private resolveOAuthContext(params: {
    state?: string;
    accessTokenCookie?: string;
  }): MetaOAuthStatePayload & { source: 'state' | 'cookie_pending_intent' } {
    if (params.state) {
      const decoded = this.verifyOAuthState(params.state);
      return { ...decoded, source: 'state' };
    }

    this.logger.warn({
      msg: 'meta.oauth.callback.state_missing_attempting_fallback',
      file: CALLBACK_FILE,
      function: 'MetaService.resolveOAuthContext',
      condition: '!params.state',
      conditionResult: true,
      hasAccessCookie: Boolean(params.accessTokenCookie),
    });

    if (!params.accessTokenCookie) {
      throw new BadRequestException(
        'Missing Meta OAuth state and no session cookie available to recover OAuth context.',
      );
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(params.accessTokenCookie);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'JWT verification failed';
      this.logger.error({
        msg: 'meta.oauth.callback.cookie_jwt_invalid',
        file: CALLBACK_FILE,
        function: 'MetaService.resolveOAuthContext',
        exceptionClass:
          error instanceof Error ? error.constructor.name : typeof error,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new BadRequestException(
        `Missing Meta OAuth state and session cookie was invalid: ${message}`,
      );
    }

    if (!payload?.sub || !payload.organizationId) {
      throw new BadRequestException(
        'Missing Meta OAuth state and session cookie payload was incomplete.',
      );
    }

    const pending = this.pendingOAuthByUserId.get(payload.sub);
    if (!pending) {
      this.logger.error({
        msg: 'meta.oauth.callback.pending_intent_missing',
        file: CALLBACK_FILE,
        function: 'MetaService.resolveOAuthContext',
        condition: 'pendingOAuthByUserId.get(userId) == null',
        conditionResult: true,
        organizationId: payload.organizationId,
        userId: payload.sub,
      });
      throw new BadRequestException(
        'Missing Meta OAuth state and no pending Meta connect intent was found for this session. Restart Connect Meta.',
      );
    }

    if (Date.now() > pending.exp) {
      this.pendingOAuthByUserId.delete(payload.sub);
      throw new BadRequestException(
        'Missing Meta OAuth state and the pending Meta connect intent has expired. Restart Connect Meta.',
      );
    }

    if (
      pending.organizationId !== payload.organizationId ||
      pending.userId !== payload.sub
    ) {
      throw new BadRequestException(
        'Missing Meta OAuth state and pending connect intent did not match the session user/organization.',
      );
    }

    this.logger.log({
      msg: 'meta.oauth.callback.context_recovered_from_cookie_pending_intent',
      organizationId: pending.organizationId,
      userId: pending.userId,
      storeId: pending.storeId ?? null,
    });

    return { ...pending, source: 'cookie_pending_intent' };
  }

  private async requireActiveAccessToken(organizationId: string) {
    const connection = await this.findActiveMetaConnection(organizationId);

    if (!connection) {
      throw new NotFoundException('No active Meta connection found.');
    }

    const credential = connection.credentials[0];
    if (!credential) {
      throw new BadRequestException('No active Meta credentials found.');
    }

    if (credential.expiresAt && credential.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Meta access token has expired. Reconnect Meta.',
      );
    }

    return {
      connection,
      accessToken: this.encryptionService.decrypt(credential.accessToken),
    };
  }

  private async findActiveMetaConnection(organizationId: string) {
    return this.prisma.platformConnection.findFirst({
      where: {
        organizationId,
        platform: PlatformType.META,
        status: ConnectionStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        credentials: {
          where: {
            isActive: true,
            revokedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async upsertLocalAdAccounts(
    platformConnectionId: string,
    organizationId: string,
    remoteAccounts: MetaAdAccount[],
  ): Promise<Map<string, { id: string }>> {
    const result = new Map<string, { id: string }>();

    for (const account of remoteAccounts) {
      const currency = this.mapCurrency(account.currency);
      const timezone = account.timezoneName?.trim() || 'UTC';
      const status = this.mapAdAccountStatus(account.accountStatus);
      const metadata: Prisma.InputJsonValue = {
        metaAccountId: account.accountId,
        metaAccountStatus: account.accountStatus ?? null,
      };

      const existing = await this.prisma.adAccount.findUnique({
        where: {
          platformConnectionId_externalId: {
            platformConnectionId,
            externalId: account.id,
          },
        },
      });

      if (existing) {
        const updated = await this.prisma.adAccount.update({
          where: { id: existing.id },
          data: {
            accountName: account.name.slice(0, 255),
            externalName: account.name.slice(0, 255),
            externalStatus: String(account.accountStatus ?? ''),
            currency,
            timezone: timezone.slice(0, 50),
            status,
            isActive: status === AdAccountStatus.ACTIVE,
            deletedAt: null,
            lastSyncedAt: new Date(),
            lastSuccessfulSyncAt: new Date(),
            metadata,
            version: { increment: 1 },
          },
          select: { id: true },
        });
        result.set(account.id, updated);
        continue;
      }

      const created = await this.prisma.adAccount.create({
        data: {
          organizationId,
          platformConnectionId,
          platform: PlatformType.META,
          externalId: account.id,
          externalName: account.name.slice(0, 255),
          externalStatus: String(account.accountStatus ?? ''),
          accountName: account.name.slice(0, 255),
          accountNumber: account.accountId.slice(0, 100),
          currency,
          timezone: timezone.slice(0, 50),
          status,
          isActive: status === AdAccountStatus.ACTIVE,
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
          metadata,
        },
        select: { id: true },
      });
      result.set(account.id, created);
    }

    return result;
  }

  private mapCurrency(value?: string): Currency {
    const normalized = (value ?? 'USD').trim().toUpperCase();
    if (SUPPORTED_CURRENCIES.has(normalized)) {
      return normalized as Currency;
    }
    return Currency.USD;
  }

  private mapAdAccountStatus(status?: number): AdAccountStatus {
    // Meta account_status: 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, etc.
    if (status === 1) {
      return AdAccountStatus.ACTIVE;
    }
    if (status === 2) {
      return AdAccountStatus.DISABLED;
    }
    if (status == null) {
      return AdAccountStatus.ACTIVE;
    }
    return AdAccountStatus.INACTIVE;
  }

  private createOAuthState(payload: MetaOAuthStatePayload): string {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const signature = this.signOAuthStateBody(body);
    return `${body}.${signature}`;
  }

  private verifyOAuthState(state: string): MetaOAuthStatePayload {
    const [body, signature] = state.split('.');

    if (!body || !signature) {
      throw new BadRequestException('Invalid Meta OAuth state.');
    }

    const expectedSignature = this.signOAuthStateBody(body);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new BadRequestException('Invalid Meta OAuth state.');
    }

    let payload: MetaOAuthStatePayload;

    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as MetaOAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid Meta OAuth state.');
    }

    if (
      !payload.organizationId ||
      !payload.userId ||
      typeof payload.exp !== 'number'
    ) {
      throw new BadRequestException('Invalid Meta OAuth state.');
    }

    if (Date.now() > payload.exp) {
      throw new BadRequestException('Meta OAuth state has expired.');
    }

    return payload;
  }

  private signOAuthStateBody(body: string): string {
    return createHmac('sha256', this.getOAuthStateSecret())
      .update(body)
      .digest('base64url');
  }

  private getOAuthStateSecret(): string {
    const secret =
      process.env.ENCRYPTION_KEY?.trim() || process.env.META_APP_SECRET?.trim();

    if (!secret) {
      throw new BadRequestException(
        'OAuth state signing secret is not configured.',
      );
    }

    return secret;
  }

  private getWebAppUrl(): string {
    const explicit = process.env.WEB_APP_URL?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    const corsOrigin = process.env.CORS_ORIGIN?.trim();
    if (corsOrigin && corsOrigin !== '*') {
      const first = corsOrigin.split(',')[0]?.trim();
      if (first) {
        return first.replace(/\/$/, '');
      }
    }

    return 'http://localhost:3000';
  }

  private buildFrontendRedirect(
    webAppUrl: string,
    query: Record<string, string | undefined>,
  ): string {
    const url = new URL('/advertising', webAppUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  /**
   * Points the browser at our own OAuth callback with a synthetic code so
   * MetaApiSimulatorService can complete connect without Facebook Login.
   */
  private buildTestModeAuthorizationUrl(
    redirectUri: string,
    state: string,
  ): string {
    const url = new URL(redirectUri);
    url.searchParams.set('code', META_TEST_OAUTH_CODE);
    url.searchParams.set('state', state);
    return url.toString();
  }

  private requireEnv(key: string): string {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new BadRequestException(`${key} is not configured.`);
    }
    return value;
  }
}
