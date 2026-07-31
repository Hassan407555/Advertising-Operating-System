const fs = require("fs");
const { URL } = require("url");

async function hop(url, maxHops = 12) {
  const chain = [];
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const location = res.headers.get("location");
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const entry = {
      hop: i,
      requestUrl: current,
      status: res.status,
      location,
      contentType: res.headers.get("content-type"),
    };
    if (location) {
      try {
        const abs = new URL(location, current);
        entry.locationAbsolute = abs.toString();
        entry.locationParams = Object.fromEntries(abs.searchParams.entries());
        // Decode nested next/cancel_url if present
        for (const key of ["next", "cancel_url", "redirect_uri"]) {
          const v = abs.searchParams.get(key);
          if (!v) continue;
          try {
            const nested = new URL(v);
            entry[`decoded_${key}`] = {
              href: nested.toString(),
              origin: nested.origin,
              pathname: nested.pathname,
              params: Object.fromEntries(nested.searchParams.entries()),
            };
            if (key === "next" && nested.searchParams.get("redirect_uri")) {
              entry.nested_redirect_uri = nested.searchParams.get("redirect_uri");
            }
          } catch {
            entry[`decoded_${key}_raw`] = v;
          }
        }
      } catch (e) {
        entry.locationParseError = String(e);
      }
    }
    // Peek body for domain error / dialog/close without consuming huge HTML fully when redirecting
    if (!location || res.status < 300 || res.status >= 400) {
      const text = await res.text();
      entry.bodyHasDomainError = /Can'?t load URL|isn't included in the app'?s domains/i.test(text);
      entry.bodyMentionsDialogClose = /dialog\/close/i.test(text);
      const closeMatch = text.match(/https?:\/\/[^"'\\\s]*dialog\/close[^"'\\\s]*/i);
      if (closeMatch) entry.dialogCloseUrlInBody = closeMatch[0].slice(0, 500);
      const title = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (title) entry.title = title[1].trim();
      entry.bodySnippet = text.replace(/\s+/g, " ").slice(0, 400);
    } else {
      // still check small bodies
      try {
        const text = await res.text();
        entry.bodyLen = text.length;
        entry.bodyHasDomainError = /Can'?t load URL|isn't included in the app'?s domains/i.test(text);
      } catch {}
    }
    chain.push(entry);
    if (!location || (res.status !== 301 && res.status !== 302 && res.status !== 303 && res.status !== 307 && res.status !== 308)) {
      break;
    }
    current = entry.locationAbsolute || new URL(location, current).toString();
  }
  return chain;
}

const authorize =
  process.argv[2] ||
  "https://www.facebook.com/v23.0/dialog/oauth?client_id=1010824391724055&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fmeta%2Fcallback&state=diagstate&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement&response_type=code";

hop(authorize).then((chain) => {
  const out = {
    startedAt: new Date().toISOString(),
    authorizeUrl: authorize,
    chain,
  };
  const path = "apps/api/scripts/qa-output/meta-oauth-redirect-chain.json";
  fs.mkdirSync("apps/api/scripts/qa-output", { recursive: true });
  fs.writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log("WROTE=" + path);
}).catch((e) => {
  console.error(String(e));
  process.exit(1);
});
