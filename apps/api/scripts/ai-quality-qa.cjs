/**
 * Full AI campaign quality QA pass.
 *
 * For each of 5 [AI-QA] products:
 *  1) Complete IMAGE interview
 *  2) Generate campaign
 *  3) Regenerate twice
 *  4) Save draft
 *  5) Reload session (GET)
 *  6) Verify draft persistence + DB entities
 *
 * Prerequisite: node scripts/seed-ai-quality-products-qa.cjs
 * Usage: node scripts/ai-quality-qa.cjs
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API = process.env.RC_API_BASE_URL ?? 'http://127.0.0.1:3001/api';
const EMAIL = process.env.AI_QA_EMAIL ?? 'hassan@gmail.com';
const PASSWORD = process.env.AI_QA_PASSWORD ?? 'Hassan123';

const PLACEHOLDER_RE =
  /\b(todo|tbd|n\/?a|lorem ipsum|your product|sample text|placeholder|xxx|\[insert|coming soon)\b/i;

const QUALITY_MARKERS = {
  hook: /\bhooks?\b/i,
  pain: /pain\s*points?/i,
  benefits: /\bbenefits?\b/i,
  offer: /\boffer\b/i,
  tone: /tone(\s+of\s+voice)?/i,
};

const FRONTEND_IMAGE_KEYS = [
  'campaignType',
  'campaignName',
  'objective',
  'audience',
  'budget',
  'cta',
  'headlines',
  'primaryText',
  'description',
  'creativeBrief',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetrySeconds(message) {
  const match = String(message ?? '').match(/try again in\s+([\d.]+)s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds) : null;
}

async function req(route, { method = 'GET', token, body, timeoutMs = 120000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text, parseError: true };
    }
    return { ok: res.ok, status: res.status, json, parseError: Boolean(json.parseError) };
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithRetry(token, sessionId, { attempts = 6 } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await req(`/ai-sessions/${sessionId}/generate`, {
      method: 'POST',
      token,
      timeoutMs: 180000,
    });
    if (last.ok && !last.parseError) return last;

    const message = String(last.json?.message ?? last.json?.raw ?? '');
    const rateLimited =
      /rate limit/i.test(message) || last.status === 429 || last.status === 500;
    if (!rateLimited || attempt === attempts) return last;

    const waitSec = extractRetrySeconds(message) ?? 25;
    const waitMs = (waitSec + 2) * 1000;
    console.error(
      `[AI-QA] Rate limited on generate (attempt ${attempt}/${attempts}), waiting ${waitMs}ms`,
    );
    await sleep(waitMs);
  }
  return last;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPlaceholder(value) {
  if (typeof value === 'string') return PLACEHOLDER_RE.test(value);
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  return false;
}

function titleTokens(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/\[ai-qa\]\s*/gi, '')
    .replace(/\[qa gen\]\s*/gi, '')
    .replace(/\[qa adv\]\s*/gi, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3)
    .slice(0, 8);
}

function productAnchors(product) {
  return [
    product.title,
    product.description,
    product.vendor,
    product.productType,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizePayload(payload) {
  return {
    campaignType: payload.campaignType ?? 'IMAGE',
    campaignName: payload.campaignName,
    objective: payload.objective,
    audience: payload.audience,
    budget: payload.budget,
    cta: payload.cta,
    headlines: Array.isArray(payload.headlines)
      ? payload.headlines
      : payload.headline
        ? [payload.headline]
        : [],
    primaryText: payload.primaryText,
    description: payload.description,
    creativeBrief: payload.creativeBrief,
  };
}

function scoreDtoMatch(payload) {
  const issues = [];
  const checks = {};
  for (const key of FRONTEND_IMAGE_KEYS) {
    const present = payload[key] !== undefined && payload[key] !== null;
    checks[`dto_${key}`] = present ? 'PASS' : 'FAIL';
    if (!present) issues.push(`Missing frontend DTO field: ${key}`);
  }
  if (!Array.isArray(payload.headlines) || payload.headlines.length < 1) {
    checks.dto_headlines_array = 'FAIL';
    issues.push('headlines must be a non-empty array');
  } else {
    checks.dto_headlines_array = 'PASS';
  }
  if (
    !payload.budget ||
    typeof payload.budget !== 'object' ||
    !Number.isFinite(Number(payload.budget.dailyBudget))
  ) {
    checks.dto_budget_shape = 'FAIL';
    issues.push('budget.dailyBudget must be a finite number');
  } else {
    checks.dto_budget_shape = 'PASS';
  }
  return { checks, issues };
}

function scoreCampaign({ product, payload, interview }) {
  const issues = [];
  const checks = {};

  const required = {
    campaignName: payload.campaignName,
    primaryText: payload.primaryText,
    headlines: (payload.headlines ?? []).join(' | '),
    description: payload.description,
    cta: payload.cta,
    audience: payload.audience,
    creativeBrief: payload.creativeBrief,
    objective: payload.objective,
  };

  for (const [key, val] of Object.entries(required)) {
    const ok = nonEmpty(val);
    checks[`field_${key}`] = ok ? 'PASS' : 'FAIL';
    if (!ok) issues.push(`Empty field: ${key}`);
    if (hasPlaceholder(val)) {
      checks[`placeholder_${key}`] = 'FAIL';
      issues.push(`Placeholder text in ${key}`);
    } else {
      checks[`placeholder_${key}`] = 'PASS';
    }
  }

  const brief = String(payload.creativeBrief ?? '');
  for (const [name, re] of Object.entries(QUALITY_MARKERS)) {
    const ok = re.test(brief);
    checks[`brief_${name}`] = ok ? 'PASS' : 'WARN';
    if (!ok) issues.push(`creativeBrief missing explicit ${name} (V1: warn)`);
  }

  const budget = Number(payload.budget?.dailyBudget);
  const expectedBudget = Number(interview.dailyBudget);
  checks.budget = budget === expectedBudget ? 'PASS' : 'WARN';
  if (budget !== expectedBudget) {
    issues.push(`Budget ${budget} != interview ${expectedBudget}`);
  }

  if (
    String(payload.objective ?? '')
      .toUpperCase()
      .includes(String(interview.objective).toUpperCase())
  ) {
    checks.objective_match = 'PASS';
  } else {
    checks.objective_match = 'WARN';
    issues.push(`Objective may not reflect interview (${interview.objective})`);
  }

  const audience = String(payload.audience ?? '').toLowerCase();
  if (audience.includes(String(interview.country).toLowerCase().split(' ')[0])) {
    checks.audience_country = 'PASS';
  } else {
    checks.audience_country = 'WARN';
    issues.push('Audience may not mention interview country');
  }

  const blob = [
    payload.campaignName,
    payload.primaryText,
    payload.description,
    payload.creativeBrief,
    ...(payload.headlines ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const tokens = titleTokens(product.title);
  const grounded = tokens.some((token) => blob.includes(token));
  checks.product_grounding = grounded ? 'PASS' : 'FAIL';
  if (!grounded) issues.push('Copy does not reference product title tokens');

  const anchors = productAnchors(product);
  for (const word of ['organic', 'fda', 'certified', 'clinically', 'patented']) {
    if (blob.includes(word) && !anchors.includes(word)) {
      checks[`hallucination_${word}`] = 'WARN';
      issues.push(`Possible ungrounded claim: ${word}`);
    }
  }

  checks.cta_format = /SHOP[_\s-]?NOW|LEARN[_\s-]?MORE|SIGN[_\s-]?UP|GET[_\s-]?OFFER|BUY[_\s-]?NOW|ORDER[_\s-]?NOW|CONTACT[_\s-]?US|SUBSCRIBE|DOWNLOAD|APPLY[_\s-]?NOW/i.test(
    String(payload.cta),
  )
    ? 'PASS'
    : 'WARN';

  const dto = scoreDtoMatch(payload);
  Object.assign(checks, dto.checks);
  issues.push(...dto.issues);

  const fails = Object.values(checks).filter((value) => value === 'FAIL').length;
  const warns = Object.values(checks).filter((value) => value === 'WARN').length;

  return { pass: fails === 0, fails, warns, checks, issues };
}

function diversityScore(versions) {
  const pairs = [];
  for (let i = 0; i < versions.length; i += 1) {
    for (let j = i + 1; j < versions.length; j += 1) {
      const a = versions[i];
      const b = versions[j];
      const fields = ['campaignName', 'primaryText', 'description', 'creativeBrief'];
      let different = 0;
      for (const field of fields) {
        if (String(a[field] ?? '').trim() !== String(b[field] ?? '').trim()) {
          different += 1;
        }
      }
      const ha = (a.headlines ?? []).join('\n');
      const hb = (b.headlines ?? []).join('\n');
      if (ha !== hb) different += 1;
      pairs.push({
        a: i + 1,
        b: j + 1,
        differentFields: different,
        meaningful: different >= 3,
      });
    }
  }
  return {
    pairs,
    allMeaningful: pairs.length > 0 && pairs.every((pair) => pair.meaningful),
  };
}

function fingerprint(payload) {
  return [
    payload.campaignName,
    payload.primaryText,
    (payload.headlines ?? []).join('|'),
    payload.description,
  ]
    .join('||')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function completeImageInterview(token, sessionId) {
  const answers = ['United States', 'English', '45', 'CONVERSIONS', 'IMAGE'];
  let status = '';
  for (const value of answers) {
    const response = await req(`/ai-sessions/${sessionId}/advance`, {
      method: 'POST',
      token,
      body: { value },
    });
    if (!response.ok) {
      throw new Error(
        `advance failed: ${response.status} ${JSON.stringify(response.json)}`,
      );
    }
    status = response.json.data.status;
  }
  return status;
}

async function verifyDbDraft(draftIds) {
  const issues = [];
  if (!draftIds?.campaignId || !draftIds?.adSetId || !draftIds?.adId || !draftIds?.creativeId) {
    return {
      pass: false,
      issues: ['draftCampaignIds incomplete on session context'],
      records: null,
    };
  }

  const [campaign, adSet, ad, creative] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: draftIds.campaignId } }),
    prisma.adSet.findUnique({ where: { id: draftIds.adSetId } }),
    prisma.ad.findUnique({ where: { id: draftIds.adId } }),
    prisma.creative.findUnique({ where: { id: draftIds.creativeId } }),
  ]);

  if (!campaign) issues.push('Campaign DB row missing');
  if (!adSet) issues.push('AdSet DB row missing');
  if (!ad) issues.push('Ad DB row missing');
  if (!creative) issues.push('Creative DB row missing');

  if (campaign && campaign.status !== 'DRAFT') {
    issues.push(`Campaign status expected DRAFT got ${campaign.status}`);
  }

  return {
    pass: issues.length === 0,
    issues,
    records: {
      campaign: campaign
        ? { id: campaign.id, name: campaign.name, status: campaign.status }
        : null,
      adSet: adSet ? { id: adSet.id, name: adSet.name, status: adSet.status } : null,
      ad: ad ? { id: ad.id, name: ad.name, status: ad.status } : null,
      creative: creative
        ? { id: creative.id, primaryText: creative.primaryText, headline: creative.headline }
        : null,
    },
  };
}

async function runProductPass({ token, store, product, interview }) {
  const result = {
    productId: product.id,
    title: product.title,
    steps: {},
    issues: [],
    snapshots: [],
  };

  if (product.activeSessionId) {
    await req(`/ai-sessions/${product.activeSessionId}/cancel`, {
      method: 'POST',
      token,
    });
  }

  const entry = await req(`/stores/${store.id}/advertising-entry`, {
    method: 'POST',
    token,
    body: { productId: product.id },
  });
  result.steps.entry = entry.ok ? 'PASS' : 'FAIL';
  if (!entry.ok) {
    result.issues.push(`entry failed ${entry.status}`);
    result.pass = false;
    return result;
  }
  const sessionId = entry.json.data.id;
  result.sessionId = sessionId;

  const readyStatus = await completeImageInterview(token, sessionId);
  result.steps.interview = readyStatus === 'READY_FOR_ANALYSIS' ? 'PASS' : 'FAIL';
  if (readyStatus !== 'READY_FOR_ANALYSIS') {
    result.issues.push(`expected READY_FOR_ANALYSIS got ${readyStatus}`);
    result.pass = false;
    return result;
  }

  const versions = [];
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) {
      // Pace regenerations to stay under Groq TPM limits.
      await sleep(22000);
    }
    const gen = await generateWithRetry(token, sessionId);
    const stepKey = i === 0 ? 'generate' : `regenerate_${i}`;
    if (!gen.ok || gen.parseError) {
      result.steps[stepKey] = 'FAIL';
      result.issues.push(
        `${stepKey} failed ${gen.status}: ${JSON.stringify(gen.json).slice(0, 400)}`,
      );
      result.pass = false;
      return result;
    }
    result.steps[stepKey] = 'PASS';
    const meta = gen.json.data.workflowContext.generatedCampaign;
    const payload = normalizePayload(meta.payload);
    versions.push(payload);
    result.provider = meta.provider;
    result.model = meta.model;
    result.snapshots.push({
      version: i + 1,
      campaignName: payload.campaignName,
      primaryText: payload.primaryText,
      headlines: payload.headlines,
      description: payload.description,
      cta: payload.cta,
      audience: payload.audience,
      creativeBrief: payload.creativeBrief,
      objective: payload.objective,
      budget: payload.budget,
    });
  }

  const finalPayload = versions[versions.length - 1];
  result.score = scoreCampaign({ product, payload: finalPayload, interview });
  result.diversity = diversityScore(versions);
  result.steps.regeneration_diversity = result.diversity.allMeaningful
    ? 'PASS'
    : 'FAIL';
  if (!result.diversity.allMeaningful) {
    result.issues.push('Regenerations not meaningfully different (>=3 fields)');
  }

  const save = await req(`/ai-sessions/${sessionId}/save-draft`, {
    method: 'POST',
    token,
    body: { payload: finalPayload },
  });
  result.steps.save_draft = save.ok ? 'PASS' : 'FAIL';
  if (!save.ok) {
    result.issues.push(
      `save-draft failed ${save.status}: ${JSON.stringify(save.json).slice(0, 400)}`,
    );
    result.pass = false;
    return result;
  }

  const reload = await req(`/ai-sessions/${sessionId}`, { token });
  result.steps.reload = reload.ok ? 'PASS' : 'FAIL';
  if (!reload.ok) {
    result.issues.push(`reload failed ${reload.status}`);
    result.pass = false;
    return result;
  }

  const reloadedContext = reload.json.data.workflowContext ?? {};
  const draftIds = reloadedContext.draftCampaignIds;
  const reloadedPayload = normalizePayload(
    reloadedContext.generatedCampaign?.payload ?? {},
  );

  const persistenceOk =
    reloadedPayload.campaignName === finalPayload.campaignName &&
    reloadedPayload.primaryText === finalPayload.primaryText &&
    Boolean(draftIds?.campaignId);
  result.steps.draft_persistence = persistenceOk ? 'PASS' : 'FAIL';
  if (!persistenceOk) {
    result.issues.push('Reloaded session missing draft payload/ids');
  }

  const db = await verifyDbDraft(draftIds);
  result.steps.db_records = db.pass ? 'PASS' : 'FAIL';
  result.db = db;
  if (!db.pass) result.issues.push(...db.issues);

  result.pass =
    result.score.pass &&
    result.diversity.allMeaningful &&
    Object.values(result.steps).every((value) => value === 'PASS');

  if (!result.score.pass) {
    result.issues.push(...result.score.issues.filter((issue) => issue.includes('Empty') || issue.includes('Placeholder') || issue.includes('Missing') || issue.includes('must be') || issue.includes('title tokens')));
  }

  return result;
}

async function main() {
  const login = await req('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
    timeoutMs: 30000,
  });
  if (!login.ok) throw new Error(`login failed ${login.status}`);
  const token = login.json.data.tokens.accessToken;

  const storesRes = await req('/stores', { token });
  const store = (storesRes.json.data ?? []).find(
    (row) => row.advertisingReady && String(row.name).includes('Alpha'),
  );
  if (!store) throw new Error('No advertising-ready Alpha store');

  const productsRes = await req(`/stores/${store.id}/products?limit=50`, { token });
  const allProducts = productsRes.json.data?.data ?? [];
  const products = allProducts.filter(
    (product) =>
      product.canAdvertise && String(product.title).startsWith('[AI-QA]'),
  );

  const filter = String(process.env.AI_QA_PRODUCT_FILTER ?? '')
    .trim()
    .toLowerCase();
  const filtered = filter
    ? products.filter((product) =>
        String(product.title).toLowerCase().includes(filter),
      )
    : products;

  if (filtered.length < 1) {
    throw new Error(
      `No matching [AI-QA] products for filter="${filter}". Found ${products.length} AI-QA products.`,
    );
  }
  if (!filter && filtered.length < 5) {
    throw new Error(
      `Need >=5 [AI-QA] advertisable products, found ${filtered.length}. Run seed-ai-quality-products-qa.cjs`,
    );
  }

  const selected = filter ? filtered : filtered.slice(0, 5);
  const interview = {
    country: 'United States',
    language: 'English',
    dailyBudget: '45',
    objective: 'CONVERSIONS',
    adType: 'IMAGE',
  };

  const results = [];
  for (let index = 0; index < selected.length; index += 1) {
    const product = selected[index];
    if (index > 0) {
      console.error('[AI-QA] Cooling down 25s between products for TPM budget...');
      await sleep(25000);
    }
    console.error(`[AI-QA] Running ${product.title}...`);
    const item = await runProductPass({ token, store, product, interview });
    results.push(item);
    console.error(
      `[AI-QA] ${product.title} => ${item.pass ? 'PASS' : 'FAIL'} (fails=${item.score?.fails ?? 'n/a'})`,
    );
  }

  const fingerprints = results
    .filter((row) => row.snapshots?.length)
    .map((row) => ({
      title: row.title,
      fp: fingerprint(row.snapshots[row.snapshots.length - 1]),
    }));
  const uniqueFingerprints = new Set(fingerprints.map((row) => row.fp));
  const crossProductUnique = uniqueFingerprints.size === fingerprints.length;

  const allPass = results.every((row) => row.pass) && crossProductUnique;
  const report = {
    generatedAt: new Date().toISOString(),
    providerExpected: 'GROQ',
    productCount: results.length,
    crossProductUnique,
    allPass,
    version1Bar:
      'Valid JSON, relevant product+interview grounding, no crashes, meaningful regen diversity, editable/saveable draft',
    results,
  };

  const outDir = path.join(__dirname, 'qa-output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'ai-quality-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.error(`[AI-QA] Wrote ${outPath}`);
  process.exit(allPass ? 0 : 2);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
