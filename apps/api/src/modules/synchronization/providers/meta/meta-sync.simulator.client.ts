import { Injectable, Logger } from '@nestjs/common';

import type {
  MetaSyncInsights,
  MetaSyncObject,
} from './meta-sync.client';

/**
 * Local Meta sync simulator — same public surface as MetaSyncClient.
 * Never calls the Meta Graph API.
 */
@Injectable()
export class MetaSyncSimulatorClient {
  private readonly logger = new Logger(MetaSyncSimulatorClient.name);

  async getObject(
    externalId: string,
    _accessToken: string,
  ): Promise<MetaSyncObject | null> {
    this.logger.log(`META_TEST_MODE simulate getObject id=${externalId}`);
    return {
      id: externalId,
      name: `Simulated ${externalId}`,
      status: 'PAUSED',
      effective_status: 'PAUSED',
      updated_time: new Date().toISOString(),
    };
  }

  async getInsights(
    externalId: string,
    _accessToken: string,
    _datePreset = 'last_30d',
  ): Promise<MetaSyncInsights | null> {
    this.logger.log(`META_TEST_MODE simulate getInsights id=${externalId}`);
    return {
      spend: '0',
      impressions: '0',
      clicks: '0',
      reach: '0',
      cpm: '0',
      cpc: '0',
      ctr: '0',
      actions: [],
    };
  }
}
