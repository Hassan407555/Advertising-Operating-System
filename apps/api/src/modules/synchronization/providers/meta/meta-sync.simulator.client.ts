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
      spend: '125.50',
      impressions: '18400',
      clicks: '642',
      reach: '15200',
      cpm: '6.82',
      cpc: '0.20',
      ctr: '3.49',
      actions: [{ action_type: 'purchase', value: '48' }],
      action_values: [{ action_type: 'purchase', value: '960.00' }],
      purchase_roas: [{ action_type: 'purchase', value: '7.65' }],
    };
  }
}
