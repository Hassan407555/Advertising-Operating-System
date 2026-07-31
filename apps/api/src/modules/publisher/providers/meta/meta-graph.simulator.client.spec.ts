import { META_TEST_FIXTURES } from '../../../../infrastructure/config/meta-test-mode';
import { MetaGraphSimulatorClient } from './meta-graph.simulator.client';

describe('MetaGraphSimulatorClient', () => {
  it('returns deterministic Meta IDs for the first of each entity', async () => {
    const client = new MetaGraphSimulatorClient();

    await expect(
      client.createCampaign('act_test_123', 'token', { name: 'C' }),
    ).resolves.toMatchObject({ id: META_TEST_FIXTURES.campaignId });

    await expect(
      client.createAdSet('act_test_123', 'token', { name: 'S' }),
    ).resolves.toMatchObject({ id: META_TEST_FIXTURES.adSetId });

    await expect(
      client.createAdCreative('act_test_123', 'token', { name: 'Cr' }),
    ).resolves.toMatchObject({ id: META_TEST_FIXTURES.creativeId });

    await expect(
      client.createAd('act_test_123', 'token', { name: 'A' }),
    ).resolves.toMatchObject({ id: META_TEST_FIXTURES.adId });
  });

  it('includes preview and ads manager URLs in raw payload', async () => {
    const client = new MetaGraphSimulatorClient();
    const created = await client.createCampaign('act_test_123', 'token', {});

    expect(created.raw).toMatchObject({
      previewUrl: META_TEST_FIXTURES.previewUrl,
      adsManagerUrl: META_TEST_FIXTURES.adsManagerUrl,
      simulated: true,
    });
  });
});
