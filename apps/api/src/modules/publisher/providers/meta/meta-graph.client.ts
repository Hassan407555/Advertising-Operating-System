import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  META_GRAPH_API_BASE_URL,
  META_GRAPH_API_VERSION,
} from './meta.constants';
import {
  MetaGraphApiException,
  type MetaGraphErrorDetails,
} from './meta-graph.error';

export interface MetaGraphCreateResult {
  id: string;
  raw: unknown;
}

interface MetaGraphErrorBody {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

interface MetaGraphResponseBody {
  id?: string;
  error?: MetaGraphErrorBody;
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

    if (
      process.env.NODE_ENV !== 'production' &&
      (/\/campaigns$/.test(path) || /\/adsets$/.test(path))
    ) {
      // access_token is attached separately below — never log it.
      const label = /\/adsets$/.test(path) ? 'AdSet' : 'Campaign';
      this.logger.log(
        `${label} payload:\n${JSON.stringify(payload, null, 2)}`,
      );
    }

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

    let raw: MetaGraphResponseBody;
    try {
      raw = (await response.json()) as MetaGraphResponseBody;
    } catch {
      const details: MetaGraphErrorDetails = {
        message: `Meta Graph API returned a non-JSON response for ${path}.`,
        httpStatus: response.status,
        path,
      };
      this.logger.error(
        `Meta Graph API error on ${path}: httpStatus=${response.status} non_json_body`,
      );
      throw new MetaGraphApiException(details);
    }

    if (!response.ok || raw.error || !raw.id) {
      const graphError = raw.error;
      const details: MetaGraphErrorDetails = {
        message:
          graphError?.error_user_msg?.trim() ||
          graphError?.message?.trim() ||
          `Meta Graph API request failed for ${path}.`,
        httpStatus: response.status,
        code: graphError?.code,
        errorSubcode: graphError?.error_subcode,
        type: graphError?.type,
        fbtraceId: graphError?.fbtrace_id,
        path,
        raw,
      };

      this.logger.error(
        `Meta Graph API error on ${path}: httpStatus=${details.httpStatus} code=${details.code ?? 'n/a'} subcode=${details.errorSubcode ?? 'n/a'} fbtrace_id=${details.fbtraceId ?? 'n/a'} raw=${JSON.stringify(raw)}`,
      );

      throw new MetaGraphApiException(details);
    }

    return {
      id: raw.id,
      raw,
    };
  }
}
