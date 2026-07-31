/**
 * Hit Nest /api/meta/* resource endpoints and print response shapes/counts.
 * Does not print tokens. Uses email/password from argv or env.
 *
 * Usage:
 *   node scripts/debug-meta-api-endpoints.cjs [email] [password]
 */
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // optional
}

const API = (process.env.API_BASE_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const email = process.argv[2] || process.env.QA_EMAIL || 'hafizhassan.khalid@gmail.com';
const password = process.argv[3] || process.env.QA_PASSWORD;

async function req(method, urlPath, token, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

function summarize(label, result) {
  const payload = result.json;
  const unwrapped =
    payload &&
    typeof payload === 'object' &&
    payload.success === true &&
    'data' in payload
      ? payload.data
      : payload;

  const isArray = Array.isArray(unwrapped);
  const count = isArray ? unwrapped.length : null;
  const sample = isArray
    ? unwrapped.slice(0, 3).map((item) => ({
        id: item?.id,
        name: item?.name,
        localAdAccountId: item?.localAdAccountId ?? undefined,
        accountId: item?.accountId ?? undefined,
        username: item?.username ?? undefined,
      }))
    : unwrapped;

  return {
    label,
    httpStatus: result.status,
    envelopeSuccess: payload?.success,
    dataIsArray: isArray,
    count,
    sample,
    errorMessage: payload?.message || payload?.error || (!result.status.toString().startsWith('2') ? payload : undefined),
  };
}

async function main() {
  if (!password) {
    // Try refresh-less: look for recent bearer is not available. Require password.
    console.log(
      JSON.stringify(
        {
          error:
            'Password required. Pass as argv[3] or set QA_PASSWORD. Email=' +
            email,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const login = await req('POST', '/auth/login', null, { email, password });
  if (login.status >= 400) {
    console.log(JSON.stringify({ error: 'login failed', login }, null, 2));
    process.exit(1);
  }

  const loginData =
    login.json?.data?.tokens || login.json?.tokens || login.json?.data;
  const accessToken =
    loginData?.accessToken ||
    login.json?.data?.accessToken ||
    login.json?.accessToken;

  if (!accessToken) {
    console.log(
      JSON.stringify(
        {
          error: 'No access token in login response',
          keys: Object.keys(login.json || {}),
          dataKeys: Object.keys(login.json?.data || {}),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const paths = [
    '/meta/connection/status',
    '/meta/businesses',
    '/meta/ad-accounts',
    '/meta/pages',
    '/meta/instagram-accounts',
    '/meta/pixels',
    '/meta/catalogs',
  ];

  const results = [];
  for (const p of paths) {
    const r = await req('GET', p, accessToken);
    results.push(summarize(p, r));
  }

  // Also with business filter once we know a business id
  const businessesResult = results.find((r) => r.label === '/meta/businesses');
  const businessId = businessesResult?.sample?.[0]?.id;
  if (businessId) {
    for (const p of [
      `/meta/ad-accounts?businessId=${businessId}`,
      `/meta/pixels?businessId=${businessId}`,
      `/meta/catalogs?businessId=${businessId}`,
    ]) {
      const r = await req('GET', p, accessToken);
      results.push(summarize(p, r));
    }
  }

  console.log(
    JSON.stringify(
      {
        api: API,
        email,
        connection: results.find((r) => r.label === '/meta/connection/status'),
        resources: results.filter((r) => r.label !== '/meta/connection/status'),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
