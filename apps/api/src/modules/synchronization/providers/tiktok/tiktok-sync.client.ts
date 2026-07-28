import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  TIKTOK_SYNC_API_BASE_URL,
  TIKTOK_SYNC_API_VERSION,
} from './tiktok.sync.constants';

export interface TikTokSyncEntity {
  campaign_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  campaign_name?: string;
  adgroup_name?: string;
  ad_name?: string;
  operation_status?: string;
  secondary_status?: string;
  status?: string;
}

export interface TikTokSyncMetrics {
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  ctr?: string | number;
  conversion?: string | number;
  conversions?: string | number;
}

interface TikTokEnvelope {
  code?: number;
  message?: string;
  data?: {
    list?: Array<Record<string, unknown>>;
  };
}

@Injectable()
export class TikTokSyncClient {
  private readonly logger = new Logger(TikTokSyncClient.name);

  async getCampaigns(
    accessToken: string,
    advertiserId: string,
    campaignIds: string[],
  ): Promise<TikTokSyncEntity[]> {
    return this.getList('campaign/get/', accessToken, {
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ campaign_ids: campaignIds }),
      page_size: 100,
    });
  }

  async getAdGroups(
    accessToken: string,
    advertiserId: string,
    adGroupIds: string[],
  ): Promise<TikTokSyncEntity[]> {
    return this.getList('adgroup/get/', accessToken, {
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ adgroup_ids: adGroupIds }),
      page_size: 100,
    });
  }

  async getAds(
    accessToken: string,
    advertiserId: string,
    adIds: string[],
  ): Promise<TikTokSyncEntity[]> {
    return this.getList('ad/get/', accessToken, {
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ ad_ids: adIds }),
      page_size: 100,
    });
  }

  async getReportMetrics(
    accessToken: string,
    advertiserId: string,
    dataLevel: 'AUCTION_CAMPAIGN' | 'AUCTION_ADGROUP' | 'AUCTION_AD',
    dimensionIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Map<string, TikTokSyncMetrics>> {
    const dimensionKey =
      dataLevel === 'AUCTION_CAMPAIGN'
        ? 'campaign_id'
        : dataLevel === 'AUCTION_ADGROUP'
          ? 'adgroup_id'
          : 'ad_id';

    const raw = await this.get(
      'report/integrated/get/',
      accessToken,
      {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: dataLevel,
        dimensions: JSON.stringify([dimensionKey]),
        metrics: JSON.stringify([
          'spend',
          'impressions',
          'clicks',
          'ctr',
          'conversion',
        ]),
        start_date: startDate,
        end_date: endDate,
        filtering: JSON.stringify([
          {
            field_name: dimensionKey,
            filter_type: 'IN',
            filter_value: JSON.stringify(dimensionIds),
          },
        ]),
        page_size: 100,
      },
    );

    const map = new Map<string, TikTokSyncMetrics>();
    for (const row of raw.data?.list ?? []) {
      const dimensions = (row.dimensions ?? {}) as Record<string, string>;
      const metrics = (row.metrics ?? row) as TikTokSyncMetrics;
      const id = dimensions[dimensionKey] ?? String(row[dimensionKey] ?? '');
      if (id) {
        map.set(id, metrics);
      }
    }

    return map;
  }

  private async getList(
    path: string,
    accessToken: string,
    query: Record<string, string | number>,
  ): Promise<TikTokSyncEntity[]> {
    const raw = await this.get(path, accessToken, query);
    return (raw.data?.list ?? []) as TikTokSyncEntity[];
  }

  private async get(
    path: string,
    accessToken: string,
    query: Record<string, string | number>,
  ): Promise<TikTokEnvelope> {
    const url = new URL(
      `${TIKTOK_SYNC_API_BASE_URL}/${TIKTOK_SYNC_API_VERSION}/${path}`,
    );

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
      },
    });

    const raw = (await response.json()) as TikTokEnvelope;

    if (!response.ok || raw.code !== 0) {
      this.logger.error(`TikTok sync error on ${path}: ${JSON.stringify(raw)}`);
      throw new InternalServerErrorException(
        raw.message ?? `TikTok sync request failed for ${path}.`,
      );
    }

    return raw;
  }
}
