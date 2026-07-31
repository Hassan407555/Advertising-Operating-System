/**
 * Local Meta test mode — replaces Graph API calls with deterministic simulators.
 *
 * Enabled when:
 * - META_TEST_MODE=true, or
 * - NODE_ENV=development (unless META_TEST_MODE=false)
 *
 * Production defaults to real Meta unless META_TEST_MODE=true is set explicitly.
 */
export function isMetaTestMode(): boolean {
  const flag = process.env.META_TEST_MODE?.trim().toLowerCase();
  if (flag === 'true') {
    return true;
  }
  if (flag === 'false') {
    return false;
  }
  return process.env.NODE_ENV?.trim().toLowerCase() === 'development';
}

/** Synthetic OAuth code used by the local connect → callback shortcut. */
export const META_TEST_OAUTH_CODE = 'META_TEST_MODE_CODE';

/**
 * Deterministic fixture IDs returned by Meta simulators.
 * Persist and treat these exactly like real Meta Graph IDs.
 */
export const META_TEST_FIXTURES = {
  userId: 'user_test_123',
  userName: 'Meta Test User',
  businessId: 'biz_test_123',
  businessName: 'Test Business',
  accountId: 'act_test_123',
  accountNumericId: 'test_123',
  accountName: 'Test Ad Account',
  pageId: 'page_test_123',
  pageName: 'Test Page',
  instagramId: 'ig_test_123',
  instagramUsername: 'test_ig',
  pixelId: 'pixel_test_123',
  pixelName: 'Test Pixel',
  catalogId: 'catalog_test_123',
  catalogName: 'Test Catalog',
  accessToken: 'META_TEST_ACCESS_TOKEN',
  campaignId: '2384_TEST_CAMPAIGN',
  adSetId: '2384_TEST_ADSET',
  adId: '2384_TEST_AD',
  creativeId: '2384_TEST_CREATIVE',
  videoId: '2384_TEST_VIDEO',
  previewUrl: 'https://example.com/meta-preview',
  adsManagerUrl: 'https://facebook.com/adsmanager',
} as const;
