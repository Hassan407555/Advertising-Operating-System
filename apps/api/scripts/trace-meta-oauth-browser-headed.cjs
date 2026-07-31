/**
 * Attempt OAuth with the user's Chrome profile (authenticated FB session).
 * Read-only network capture — does not change profile settings.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  const { chromium } = require('playwright');
  const authorizeUrl =
    process.argv[2] ||
    'https://www.facebook.com/v23.0/dialog/oauth?client_id=1010824391724055&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fmeta%2Fcallback&state=diagstate&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement&response_type=code';

  const userData =
    process.env.CHROME_USER_DATA ||
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

  // Use a dedicated clone dir to avoid locking the live Chrome profile.
  const cloneRoot = path.join(os.tmpdir(), 'aos-chrome-oauth-trace');
  fs.mkdirSync(cloneRoot, { recursive: true });

  const network = [];
  const navigations = [];

  let context;
  try {
    context = await chromium.launchPersistentContext(cloneRoot, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 900 },
      args: [
        `--disable-extensions`,
        // Do not point at live profile while Chrome is open; cold profile still
        // captures logged-out chain. For logged-in, pass CHROME_USER_DATA_COPY.
      ],
    });
  } catch (e) {
    console.error('LAUNCH_FAIL=' + String(e));
    process.exit(1);
  }

  const page = context.pages()[0] || (await context.newPage());

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations.push({ at: new Date().toISOString(), url: frame.url() });
    }
  });

  page.on('request', (req) => {
    if (['document', 'xhr', 'fetch'].includes(req.resourceType())) {
      network.push({
        phase: 'request',
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        redirectedFrom: req.redirectedFrom()?.url() ?? null,
      });
    }
  });

  page.on('response', (res) => {
    const req = res.request();
    if (!['document', 'xhr', 'fetch'].includes(req.resourceType())) return;
    const headers = res.headers();
    network.push({
      phase: 'response',
      url: res.url(),
      status: res.status(),
      location: headers.location || null,
      redirectedFrom: req.redirectedFrom()?.url() ?? null,
    });
  });

  await page.goto(authorizeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const report = {
    startedAt: new Date().toISOString(),
    authorizeUrl,
    profileMode: 'temp-empty',
    finalUrl: page.url(),
    title: await page.title(),
    bodyHasDomainError: /Can'?t load URL|isn't included in the app'?s domains/i.test(html),
    bodyMentionsDialogClose: /dialog\/close/i.test(html),
    navigations,
    redirects: network.filter((n) => n.phase === 'response' && n.status >= 300 && n.status < 400),
    documentRequests: network.filter((n) => n.resourceType === 'document' || (n.phase === 'response' && n.url.includes('facebook.com'))).slice(0, 40),
  };

  const close = html.match(/https?:\/\/[^"'\\\s<>]*dialog\/close[^"'\\\s<>]*/i);
  if (close) report.dialogCloseUrlInHtml = close[0];

  // Extract cancel_url from final URL if present
  try {
    const u = new URL(page.url());
    report.finalCancelUrl = u.searchParams.get('cancel_url');
    report.finalNext = u.searchParams.get('next');
  } catch {}

  const out = path.join(__dirname, 'qa-output', 'meta-oauth-browser-network-headed.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('WROTE=' + out);
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
