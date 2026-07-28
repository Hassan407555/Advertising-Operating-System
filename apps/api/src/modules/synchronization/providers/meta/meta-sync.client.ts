import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  META_SYNC_GRAPH_API_BASE_URL,
  META_SYNC_GRAPH_API_VERSION,
  META_SYNC_INSIGHT_FIELDS,
  META_SYNC_OBJECT_FIELDS,
} from './meta.sync.constants';

export interface MetaSyncObject {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  updated_time?: string;
}

export interface MetaSyncInsights {
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
}

@Injectable()
export class MetaSyncClient {
  private readonly logger = new Logger(MetaSyncClient.name);

  async getObject(
    externalId: string,
    accessToken: string,
  ): Promise<MetaSyncObject | null> {
    const url = new URL(
      `${META_SYNC_GRAPH_API_BASE_URL}/${META_SYNC_GRAPH_API_VERSION}/${externalId}`,
    );
    url.searchParams.set('fields', META_SYNC_OBJECT_FIELDS);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    const raw = (await response.json()) as MetaSyncObject & {
      error?: { message?: string; code?: number; error_subcode?: number };
    };

    if (raw.error) {
      // Object deleted / inaccessible
      if (
        raw.error.code === 100 ||
        raw.error.code === 803 ||
        raw.error.error_subcode === 33
      ) {
        return null;
      }

      this.logger.error(`Meta getObject error: ${JSON.stringify(raw.error)}`);
      throw new InternalServerErrorException(
        raw.error.message ?? 'Meta Graph API getObject failed.',
      );
    }

    return raw;
  }

  async getInsights(
    externalId: string,
    accessToken: string,
    datePreset = 'last_30d',
  ): Promise<MetaSyncInsights | null> {
    const url = new URL(
      `${META_SYNC_GRAPH_API_BASE_URL}/${META_SYNC_GRAPH_API_VERSION}/${externalId}/insights`,
    );
    url.searchParams.set('fields', META_SYNC_INSIGHT_FIELDS);
    url.searchParams.set('date_preset', datePreset);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    const raw = (await response.json()) as {
      data?: MetaSyncInsights[];
      error?: { message?: string; code?: number };
    };

    if (raw.error) {
      this.logger.warn(
        `Meta insights unavailable for ${externalId}: ${raw.error.message}`,
      );
      return null;
    }

    return raw.data?.[0] ?? null;
  }
}
