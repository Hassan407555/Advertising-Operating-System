import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  META_GRAPH_API_BASE_URL,
  META_GRAPH_API_VERSION,
} from './meta.constants';

export interface MetaGraphCreateResult {
  id: string;
  raw: unknown;
}

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);

  async createCampaign(
    adAccountExternalId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    return this.post(
      `${this.normalizeAdAccountId(adAccountExternalId)}/campaigns`,
      accessToken,
      payload,
    );
  }

  async createAdSet(
    adAccountExternalId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    return this.post(
      `${this.normalizeAdAccountId(adAccountExternalId)}/adsets`,
      accessToken,
      payload,
    );
  }

  async createAdCreative(
    adAccountExternalId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    return this.post(
      `${this.normalizeAdAccountId(adAccountExternalId)}/adcreatives`,
      accessToken,
      payload,
    );
  }

  async createAd(
    adAccountExternalId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    return this.post(
      `${this.normalizeAdAccountId(adAccountExternalId)}/ads`,
      accessToken,
      payload,
    );
  }

  /**
   * Upload a video by publicly reachable file_url into the ad account library.
   * Returns Meta video_id used by video_data creatives.
   */
  async uploadVideoByUrl(
    adAccountExternalId: string,
    accessToken: string,
    fileUrl: string,
    name?: string,
  ): Promise<MetaGraphCreateResult> {
    return this.post(
      `${this.normalizeAdAccountId(adAccountExternalId)}/advideos`,
      accessToken,
      {
        file_url: fileUrl,
        ...(name ? { name: name.slice(0, 255), title: name.slice(0, 255) } : {}),
      },
    );
  }

  private normalizeAdAccountId(externalId: string): string {
    return externalId.startsWith('act_') ? externalId : `act_${externalId}`;
  }

  private async post(
    path: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaGraphCreateResult> {
    const url = `${META_GRAPH_API_BASE_URL}/${META_GRAPH_API_VERSION}/${path}`;

    const body = new URLSearchParams();
    body.set('access_token', accessToken);

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) {
        continue;
      }

      body.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const raw = (await response.json()) as {
      id?: string;
      error?: { message?: string; code?: number };
    };

    if (!response.ok || raw.error || !raw.id) {
      this.logger.error(`Meta Graph API error on ${path}: ${JSON.stringify(raw)}`);
      throw new InternalServerErrorException(
        raw.error?.message ?? `Meta Graph API request failed for ${path}.`,
      );
    }

    return {
      id: raw.id,
      raw,
    };
  }
}
