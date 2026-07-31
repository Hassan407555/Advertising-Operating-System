/**
 * Call Nest /api/meta resource endpoints using a short-lived JWT signed with JWT_SECRET.
 * Prints response counts/shapes only (no tokens).
 */
const path = require('path');
const crypto = require('crypto');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // optional
}

const API = 'http://127.0.0.1:3001/api';
const orgId = process.argv[2] || 'cms72gsxe0002i0y82wzmykjc';
const userId = process.argv[3] || '26de426a-6727-4fe7-bcf8-a05f08270227';

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

async function get(urlPath, token) {
  const res = await fetch(`${API}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function summarize(label, result) {
  const payload = result.json;
  const data =
    payload && typeof payload === 'object' && payload.success === true
      ? payload.data
      : payload;
  const isArray = Array.isArray(data);
  return {
    label,
    httpStatus: result.status,
    envelopeSuccess: payload?.success ?? null,
    dataType: isArray ? 'array' : typeof data,
    count: isArray ? data.length : null,
    sample: isArray
      ? data.slice(0, 5).map((item) => ({
          id: item?.id,
          name: item?.name ?? null,
          localAdAccountId: item?.localAdAccountId ?? null,
          accountId: item?.accountId ?? null,
          username: item?.username ?? null,
        }))
      : data && typeof data === 'object'
        ? {
            id: data.id,
            accountName: data.accountName,
            connected: data.connected,
            status: data.status,
            message: data.message,
            error: data.error,
          }
        : data,
  };
}

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET missing');
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signJwt(
    {
      sub: userId,
      email: 'hafizhassan.khalid@gmail.com',
      organizationId: orgId,
      role: 'OWNER',
      iat: now,
      exp: now + 15 * 60,
    },
    secret,
  );

  const paths = [
    '/meta/connection/status',
    '/meta/businesses',
    '/meta/ad-accounts',
    '/meta/pages',
    '/meta/instagram-accounts',
    '/meta/pixels',
    '/meta/catalogs',
  ];

  const out = [];
  for (const p of paths) {
    out.push(summarize(p, await get(p, token)));
  }

  const businesses = out.find((r) => r.label === '/meta/businesses');
  const businessId = businesses?.sample?.[0]?.id;
  if (businessId) {
    out.push(
      summarize(
        `/meta/ad-accounts?businessId=${businessId}`,
        await get(`/meta/ad-accounts?businessId=${businessId}`, token),
      ),
    );
    out.push(
      summarize(
        `/meta/pixels?businessId=${businessId}`,
        await get(`/meta/pixels?businessId=${businessId}`, token),
      ),
    );
    out.push(
      summarize(
        `/meta/catalogs?businessId=${businessId}`,
        await get(`/meta/catalogs?businessId=${businessId}`, token),
      ),
    );
  }

  const pages = out.find((r) => r.label === '/meta/pages');
  const pageId = pages?.sample?.[0]?.id;
  if (pageId) {
    out.push(
      summarize(
        `/meta/instagram-accounts?pageId=${pageId}`,
        await get(`/meta/instagram-accounts?pageId=${pageId}`, token),
      ),
    );
  }

  console.log(JSON.stringify({ orgId, userId, results: out }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
