/**
 * Browser network trace for Meta OAuth authorize URL.
 * Captures every request/response/navigation without guessing.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    try {
      ({ chromium } = require('../../../../node_modules/playwright'));
    } catch (e) {
      console.error('PLAYWRIGHT_MISSING');
      process.exit(2);
    }
  }

  const authorizeUrl =
    process.argv[2] ||
    'https://www.facebook.com/v23.0/dialog/oauth?client_id=1010824391724055&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fmeta%2Fcallback&state=diagstate&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement&response_type=code';

  const outDir = path.join(__dirname, 'qa-output');
  fs.mkdirSync(outDir, { recursive: true });

  const network = [];
  const navigations = [];

  // Prefer installed Google Chrome to avoid downloading Playwright browsers.
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--disable-http2'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations.push({
        at: new Date().toISOString(),
        url: frame.url(),
      });
    }
  });

  page.on('request', (req) => {
    if (req.resourceType() === 'document' || req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      network.push({
        phase: 'request',
        at: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        redirectedFrom: req.redirectedFrom()?.url() ?? null,
      });
    }
  });

  page.on('response', async (res) => {
    const req = res.request();
    if (req.resourceType() !== 'document' && req.resourceType() !== 'xhr' && req.resourceType() !== 'fetch') {
      return;
    }
    const headers = res.headers();
    const entry = {
      phase: 'response',
      at: new Date().toISOString(),
      url: res.url(),
      status: res.status(),
      statusText: res.statusText(),
      location: headers.location || headers.Location || null,
      contentType: headers['content-type'] || null,
      redirectedFrom: req.redirectedFrom()?.url() ?? null,
      requestUrl: req.url(),
    };

    if (res.status() >= 300 && res.status() < 400) {
      entry.redirectClass = true;
    }

    // Capture body signals for HTML documents only
    if ((headers['content-type'] || '').includes('text/html') && res.status() < 400) {
      try {
        const text = await res.text();
        entry.bodyHasDomainError = /Can'?t load URL|isn't included in the app'?s domains/i.test(text);
        entry.bodyMentionsDialogClose = /dialog\/close/i.test(text);
        const title = text.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (title) entry.title = title[1].trim();
        const closeUrl = text.match(/https?:\\\/\\\/[^"'\\\s]*dialog\\\/close[^"'\\\s]*/i)
          || text.match(/\/[vV]\d+\.\d+\/dialog\/close[^"'\\\s]*/);
        if (closeUrl) entry.dialogCloseRef = String(closeUrl[0]).slice(0, 400);
      } catch {
        // response body may already be consumed by navigation
      }
    }

    network.push(entry);
  });

  let finalUrl = null;
  let pageContentSignals = {};
  try {
    const response = await page.goto(authorizeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    // Allow client-side redirects to settle
    await page.waitForTimeout(2500);
    finalUrl = page.url();
    const html = await page.content();
    pageContentSignals = {
      finalUrl,
      title: await page.title(),
      bodyHasDomainError: /Can'?t load URL|isn't included in the app'?s domains/i.test(html),
      bodyMentionsDialogClose: /dialog\/close/i.test(html),
      finalStatus: response?.status() ?? null,
    };
    const closeInHtml = html.match(/https?:\/\/[^"'\\\s<>]*dialog\/close[^"'\\\s<>]*/i);
    if (closeInHtml) pageContentSignals.dialogCloseUrlInHtml = closeInHtml[0].slice(0, 500);
  } catch (e) {
    pageContentSignals = { error: String(e), finalUrl: page.url() };
  }

  const report = {
    startedAt: new Date().toISOString(),
    authorizeUrl,
    navigations,
    documentAndXhrNetwork: network,
    pageContentSignals,
    redirectResponses: network.filter(
      (n) => n.phase === 'response' && n.status >= 300 && n.status < 400,
    ),
  };

  const outPath = path.join(outDir, 'meta-oauth-browser-network.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('WROTE=' + outPath);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
