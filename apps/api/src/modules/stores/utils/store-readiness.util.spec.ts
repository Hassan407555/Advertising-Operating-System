import { getMetaPublishBlockingReasons } from './store-readiness.util';

const baseCapabilities = {
  shopifyConnected: true,
  productsSynced: true,
  productCount: 10,
  lastSyncAt: new Date().toISOString(),
  metaConnected: true,
  businessManagerSelected: true,
  adAccountSelected: true,
  facebookPageSelected: true,
  instagramSelected: true,
  pixelSelected: true,
  catalogSelected: true,
};

describe('getMetaPublishBlockingReasons', () => {
  it('allows publish when optional Instagram is missing', () => {
    const reasons = getMetaPublishBlockingReasons({
      ...baseCapabilities,
      instagramSelected: false,
    });

    expect(reasons).toEqual([]);
  });

  it('allows publish when optional Pixel is missing', () => {
    const reasons = getMetaPublishBlockingReasons({
      ...baseCapabilities,
      pixelSelected: false,
    });

    expect(reasons).toEqual([]);
  });

  it('allows publish when optional Catalog is missing', () => {
    const reasons = getMetaPublishBlockingReasons({
      ...baseCapabilities,
      catalogSelected: false,
    });

    expect(reasons).toEqual([]);
  });

  it('fails publish when required Meta publish fields are missing', () => {
    const reasons = getMetaPublishBlockingReasons({
      ...baseCapabilities,
      metaConnected: false,
      businessManagerSelected: false,
      adAccountSelected: false,
      facebookPageSelected: false,
    });

    expect(reasons).toEqual([
      'Meta is not connected',
      'Business Manager is not selected',
      'Ad account is not selected',
      'Facebook Page is not selected',
    ]);
  });
});
