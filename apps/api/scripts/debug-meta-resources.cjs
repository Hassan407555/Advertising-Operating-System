/**
 * Debug Meta Graph resource loading for the active META connection.
 * Decrypts stored token and calls the same Graph endpoints the API uses.
 *
 * Usage: node scripts/debug-meta-resources.cjs [organizationId]
 */
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Load apps/api/.env without printing secrets
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv may already be available via prisma
}

const ORG =
  process.argv[2] || 'cms72gsxe0002i0y82wzmykjc';
const GRAPH_VERSION =
  (process.env.META_GRAPH_API_VERSION || 'v23.0').trim();
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function decrypt(value) {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY missing');
  }
  const key = crypto.createHash('sha256').update(secret).digest();
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function redactUrl(url) {
  return url.replace(/([?&]access_token=)[^&]+/i, '$1[REDACTED]');
}

async function graphGet(accessToken, graphPath, params = {}) {
  const url = new URL(`${GRAPH_BASE}/${graphPath}`);
  url.searchParams.set('access_token', accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const safeUrl = redactUrl(url.toString());
  let status = 0;
  let body = null;
  let error = null;

  try {
    const res = await fetch(url.toString());
    status = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 2000) };
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const dataArr = Array.isArray(body?.data) ? body.data : null;
  const count = dataArr ? dataArr.length : body?.error ? null : undefined;

  return {
    graphPath,
    graphUrl: safeUrl,
    httpStatus: status,
    count,
    body,
    fetchError: error,
  };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const connection = await prisma.platformConnection.findFirst({
      where: {
        organizationId: ORG,
        platform: 'META',
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        credentials: {
          where: { isActive: true, revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection) {
      console.log(JSON.stringify({ error: 'No active META connection', org: ORG }, null, 2));
      return;
    }

    const credential = connection.credentials[0];
    if (!credential?.accessToken) {
      console.log(JSON.stringify({ error: 'No active credential', connectionId: connection.id }, null, 2));
      return;
    }

    const accessToken = decrypt(credential.accessToken);
    const tokenPreview = `${accessToken.slice(0, 8)}…${accessToken.slice(-4)} (len=${accessToken.length})`;

    const results = {};

    // Same endpoints as MetaApiService
    results.me = await graphGet(accessToken, 'me', { fields: 'id,name' });
    results.permissions = await graphGet(accessToken, 'me/permissions');
    results.businesses = await graphGet(accessToken, 'me/businesses', {
      fields: 'id,name',
      limit: '100',
    });
    results.adAccounts = await graphGet(accessToken, 'me/adaccounts', {
      fields: 'id,account_id,name,currency,timezone_name,account_status',
      limit: '100',
    });
    results.pages = await graphGet(accessToken, 'me/accounts', {
      fields: 'id,name,category',
      limit: '100',
    });

    // Dependent resources
    const businesses = results.businesses.body?.data ?? [];
    const pages = results.pages.body?.data ?? [];
    const adAccounts = results.adAccounts.body?.data ?? [];

    results.instagramAccounts = { perPage: [], aggregated: [] };
    for (const page of pages.slice(0, 10)) {
      const iba = await graphGet(accessToken, page.id, {
        fields: 'instagram_business_account{id,username,name}',
      });
      const igEdge = await graphGet(accessToken, `${page.id}/instagram_accounts`, {
        fields: 'id,username,name',
        limit: '50',
      });
      results.instagramAccounts.perPage.push({
        pageId: page.id,
        pageName: page.name,
        instagram_business_account: iba,
        instagram_accounts: igEdge,
      });
      if (iba.body?.instagram_business_account?.id) {
        results.instagramAccounts.aggregated.push(iba.body.instagram_business_account);
      }
      for (const ig of igEdge.body?.data ?? []) {
        results.instagramAccounts.aggregated.push(ig);
      }
    }

    results.pixels = { perAdAccount: [], aggregated: [] };
    for (const account of adAccounts.slice(0, 10)) {
      const actId = String(account.id).startsWith('act_')
        ? account.id
        : `act_${account.account_id || account.id}`;
      const pixels = await graphGet(accessToken, `${actId}/adspixels`, {
        fields: 'id,name',
        limit: '100',
      });
      results.pixels.perAdAccount.push({ adAccountId: actId, ...pixels });
      for (const p of pixels.body?.data ?? []) {
        results.pixels.aggregated.push(p);
      }
    }

    results.catalogs = { perBusiness: [], aggregated: [] };
    for (const business of businesses.slice(0, 10)) {
      const owned = await graphGet(
        accessToken,
        `${business.id}/owned_product_catalogs`,
        { fields: 'id,name', limit: '100' },
      );
      const client = await graphGet(
        accessToken,
        `${business.id}/client_product_catalogs`,
        { fields: 'id,name', limit: '100' },
      );
      results.catalogs.perBusiness.push({
        businessId: business.id,
        businessName: business.name,
        owned,
        client,
      });
      for (const c of [...(owned.body?.data ?? []), ...(client.body?.data ?? [])]) {
        results.catalogs.aggregated.push(c);
      }
    }

    // Also try business-owned ad accounts / pixels if businesses exist
    results.businessAdAccounts = [];
    results.businessPixels = [];
    for (const business of businesses.slice(0, 5)) {
      const owned = await graphGet(accessToken, `${business.id}/owned_ad_accounts`, {
        fields: 'id,account_id,name',
        limit: '100',
      });
      const client = await graphGet(accessToken, `${business.id}/client_ad_accounts`, {
        fields: 'id,account_id,name',
        limit: '100',
      });
      results.businessAdAccounts.push({ businessId: business.id, owned, client });

      const ownedPx = await graphGet(accessToken, `${business.id}/owned_pixels`, {
        fields: 'id,name',
        limit: '100',
      });
      const clientPx = await graphGet(accessToken, `${business.id}/client_pixels`, {
        fields: 'id,name',
        limit: '100',
      });
      results.businessPixels.push({ businessId: business.id, owned: ownedPx, client: clientPx });
    }

    const summary = {
      org: ORG,
      connectionId: connection.id,
      metaUserId: connection.accountId,
      metaUserName: connection.accountName,
      tokenPreview,
      scopesStored: credential.scopes,
      expiresAt: credential.expiresAt,
      graphVersion: GRAPH_VERSION,
      counts: {
        businesses: results.businesses.count ?? 0,
        adAccounts: results.adAccounts.count ?? 0,
        pages: results.pages.count ?? 0,
        instagramAccounts: results.instagramAccounts.aggregated.length,
        pixels: results.pixels.aggregated.length,
        catalogs: results.catalogs.aggregated.length,
      },
      endpoints: {
        businesses: {
          graphUrl: results.businesses.graphUrl,
          httpStatus: results.businesses.httpStatus,
          count: results.businesses.count,
          body: results.businesses.body,
        },
        adAccounts: {
          graphUrl: results.adAccounts.graphUrl,
          httpStatus: results.adAccounts.httpStatus,
          count: results.adAccounts.count,
          body: results.adAccounts.body,
        },
        pages: {
          graphUrl: results.pages.graphUrl,
          httpStatus: results.pages.httpStatus,
          count: results.pages.count,
          body: results.pages.body,
        },
        instagramAccounts: {
          note: 'Derived from pages; see perPage for raw Graph responses',
          count: results.instagramAccounts.aggregated.length,
          perPage: results.instagramAccounts.perPage,
          aggregated: results.instagramAccounts.aggregated,
        },
        pixels: {
          note: 'From me/adaccounts → {act}/adspixels (+ business edges if any)',
          count: results.pixels.aggregated.length,
          perAdAccount: results.pixels.perAdAccount,
          businessPixels: results.businessPixels,
          aggregated: results.pixels.aggregated,
        },
        catalogs: {
          note: 'From me/businesses → owned/client_product_catalogs',
          count: results.catalogs.aggregated.length,
          perBusiness: results.catalogs.perBusiness,
          aggregated: results.catalogs.aggregated,
        },
      },
      me: results.me,
      permissions: results.permissions,
      businessAdAccounts: results.businessAdAccounts,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
