import { Injectable, Logger } from '@nestjs/common';

import { META_TEST_FIXTURES } from '../../../../infrastructure/config/meta-test-mode';

import type { MetaGraphCreateResult } from './meta-graph.client';

/**
 * Local Meta Graph simulator — same public surface as MetaGraphClient.
 * Never calls the Meta Graph API.
 */
@Injectable()
export class MetaGraphSimulatorClient {
  private readonly logger = new Logger(MetaGraphSimulatorClient.name);

  private campaignSeq = 0;
  private adSetSeq = 0;
  private creativeSeq = 0;
  private adSeq = 0;
  private videoSeq = 0;

  async createCampaign(
    adAccountExternalId: string,
    _accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    const id = this.nextId('campaign', META_TEST_FIXTURES.campaignId);
    this.logger.log(
      `META_TEST_MODE simulate createCampaign account=${adAccountExternalId} id=${id}`,
    );
    return this.result(id, {
      type: 'campaign',
      adAccountExternalId,
      payload,
    });
  }

  async createAdSet(
    adAccountExternalId: string,
    _accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    const id = this.nextId('adSet', META_TEST_FIXTURES.adSetId);
    this.logger.log(
      `META_TEST_MODE simulate createAdSet account=${adAccountExternalId} id=${id}`,
    );
    return this.result(id, {
      type: 'adSet',
      adAccountExternalId,
      payload,
    });
  }

  async createAdCreative(
    adAccountExternalId: string,
    _accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    const id = this.nextId('creative', META_TEST_FIXTURES.creativeId);
    this.logger.log(
      `META_TEST_MODE simulate createAdCreative account=${adAccountExternalId} id=${id}`,
    );
    return this.result(id, {
      type: 'creative',
      adAccountExternalId,
      payload,
    });
  }

  async createAd(
    adAccountExternalId: string,
    _accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    const id = this.nextId('ad', META_TEST_FIXTURES.adId);
    this.logger.log(
      `META_TEST_MODE simulate createAd account=${adAccountExternalId} id=${id}`,
    );
    return this.result(id, {
      type: 'ad',
      adAccountExternalId,
      payload,
    });
  }

  async uploadVideoByUrl(
    adAccountExternalId: string,
    _accessToken: string,
    fileUrl: string,
    name?: string,
  ): Promise<MetaGraphCreateResult> {
    const id = this.nextId('video', META_TEST_FIXTURES.videoId);
    this.logger.log(
      `META_TEST_MODE simulate uploadVideoByUrl account=${adAccountExternalId} id=${id}`,
    );
    return this.result(id, {
      type: 'video',
      adAccountExternalId,
      fileUrl,
      name: name ?? null,
    });
  }

  private nextId(
    kind: 'campaign' | 'adSet' | 'creative' | 'ad' | 'video',
    base: string,
  ): string {
    const seq =
      kind === 'campaign'
        ? ++this.campaignSeq
        : kind === 'adSet'
          ? ++this.adSetSeq
          : kind === 'creative'
            ? ++this.creativeSeq
            : kind === 'ad'
              ? ++this.adSeq
              : ++this.videoSeq;

    return seq === 1 ? base : `${base}_${seq}`;
  }

  private result(
    id: string,
    detail: Record<string, unknown>,
  ): MetaGraphCreateResult {
    return {
      id,
      raw: {
        id,
        simulated: true,
        previewUrl: META_TEST_FIXTURES.previewUrl,
        adsManagerUrl: META_TEST_FIXTURES.adsManagerUrl,
        ...detail,
      },
    };
  }
}
