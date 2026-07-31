async function firstHop(label, redirectUri) {
  const url =
    'https://www.facebook.com/v23.0/dialog/oauth?client_id=1010824391724055' +
    '&redirect_uri=' +
    encodeURIComponent(redirectUri) +
    '&state=diagstate&scope=ads_management&response_type=code';
  const res = await fetch(url, {
    redirect: 'manual',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    },
  });
  const loc = res.headers.get('location');
  let cancel = null;
  let nestedRedirect = null;
  let isBusiness = null;
  let locationKind = null;
  if (loc) {
    const u = new URL(loc, url);
    cancel = u.searchParams.get('cancel_url');
    isBusiness = u.searchParams.get('is_business_login');
    const next = u.searchParams.get('next');
    if (next) {
      try {
        nestedRedirect = new URL(next).searchParams.get('redirect_uri');
      } catch {}
    }
    if (loc.includes('dialog/close')) locationKind = 'dialog_close';
    else if (loc.includes('login.php')) locationKind = 'login_php';
    else if (loc.includes('dialog/oauth')) locationKind = 'dialog_oauth';
    else locationKind = 'other';
  }
  return {
    label,
    requestRedirectUri: redirectUri,
    status: res.status,
    locationKind,
    cancel_url: cancel,
    nested_redirect_uri: nestedRedirect,
    is_business_login: isBusiness,
  };
}

(async () => {
  const results = [];
  for (const [label, uri] of [
    ['http_callback', 'http://localhost:3001/api/meta/callback'],
    ['https_callback', 'https://localhost:3001/api/meta/callback'],
    ['http_127', 'http://127.0.0.1:3001/api/meta/callback'],
    ['http_frontend', 'http://localhost:3000/advertising'],
    ['http_web_root', 'http://localhost:3000/'],
  ]) {
    results.push(await firstHop(label, uri));
  }
  console.log(JSON.stringify(results, null, 2));
})();
