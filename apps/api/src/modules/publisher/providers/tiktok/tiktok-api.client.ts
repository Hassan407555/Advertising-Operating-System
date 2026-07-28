import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  TIKTOK_API_BASE_URL,
  TIKTOK_API_VERSION,
} from './tiktok.constants';

export interface TikTokApiCreateResult {
  id: string;
  raw: unknown;
}

interface TikTokApiEnvelope {
  code?: number;
  message?: string;
  request_id?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class TikTokApiClient {
  private readonly logger = new Logger(TikTokApiClient.name);

  async createCampaign(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<TikTokApiCreateResult> {
    const raw = await this.post('campaign/create/', accessToken, payload);
    const id = this.extractId(raw.data, ['campaign_id', 'id']);
    return { id, raw };
  }

  async createAdGroup(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<TikTokApiCreateResult> {
    const raw = await this.post('adgroup/create/', accessToken, payload);
    const id = this.extractId(raw.data, ['adgroup_id', 'id']);
    return { id, raw };
  }

  /**
   * Upload an image by public URL into the advertiser asset library.
   * Returns TikTok image_id used by ad creatives.
   */
  async uploadImageByUrl(
    accessToken: string,
    advertiserId: string,
    imageUrl: string,
    fileName?: string,
  ): Promise<TikTokApiCreateResult> {
    const raw = await this.post('file/image/ad/upload/', accessToken, {
      advertiser_id: advertiserId,
      upload_type: 'UPLOAD_BY_URL',
      image_url: imageUrl,
      ...(fileName ? { file_name: fileName.slice(0, 100) } : {}),
    });

    const id = this.extractId(raw.data, ['image_id', 'id']);
    return { id, raw };
  }

  async createAd(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<TikTokApiCreateResult> {
    const raw = await this.post('ad/create/', accessToken, payload);
    const data = raw.data ?? {};

    const adIds = data.ad_ids;
    if (Array.isArray(adIds) && typeof adIds[0] === 'string') {
      return { id: adIds[0], raw };
    }

    const id = this.extractId(data, ['ad_id', 'id']);
    return { id, raw };
  }

  private async post(
    path: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<TikTokApiEnvelope> {
    const url = `${TIKTOK_API_BASE_URL}/${TIKTOK_API_VERSION}/${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    });

    const raw = (await response.json()) as TikTokApiEnvelope;

    if (!response.ok || raw.code !== 0) {
      this.logger.error(
        `TikTok API error on ${path}: ${JSON.stringify(raw)}`,
      );
      throw new InternalServerErrorException(
        raw.message ?? `TikTok API request failed for ${path}.`,
      );
    }

    return raw;
  }

  private extractId(
    data: Record<string, unknown> | undefined,
    keys: string[],
  ): string {
    if (!data) {
      throw new InternalServerErrorException(
        'TikTok API response missing data payload.',
      );
    }

    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
      if (typeof value === 'number') {
        return String(value);
      }
    }

    throw new InternalServerErrorException(
      `TikTok API response missing id fields (${keys.join(', ')}).`,
    );
  }
}
