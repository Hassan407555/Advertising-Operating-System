import { PublishEntityType } from '../enums/publisher.enums';
import type { MetaGraphErrorDetails } from '../providers/meta/meta-graph.error';

/**
 * Ordered publish pipeline stages used for progress + failure diagnostics.
 */
export type PublishStage =
  | 'campaign'
  | 'ad_set'
  | 'creative'
  | 'image_upload'
  | 'video_upload'
  | 'ad'
  | 'publish_complete';

export type PublishStageStatus = 'started' | 'succeeded' | 'failed' | 'skipped';

export interface PublishStageLog {
  stage: PublishStage;
  status: PublishStageStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  entityType?: PublishEntityType;
  entityId?: string;
  message?: string;
  metaError?: MetaGraphErrorDetails;
}

/**
 * Structured publisher result diagnostics returned to the frontend.
 *
 * Example failure:
 * {
 *   success: false,
 *   stage: "creative_upload" → mapped as "video_upload" | "creative",
 *   errorCode: "META_VIDEO_UPLOAD_FAILED",
 *   errorMessage: "(#100) ...",
 *   metaTraceId: "...",
 *   retryable: true
 * }
 */
export interface PublishDiagnostics {
  success: boolean;
  stage?: PublishStage;
  errorCode?: string;
  errorMessage?: string;
  metaTraceId?: string;
  httpStatus?: number;
  graphErrorCode?: number;
  graphErrorSubcode?: number;
  retryable?: boolean;
  stages: PublishStageLog[];
}

export const PUBLISH_STAGE_TITLES: Record<
  PublishStage,
  { success: string; failed: string }
> = {
  campaign: {
    success: 'Campaign Created',
    failed: 'Campaign Creation Failed',
  },
  ad_set: {
    success: 'Ad Set Created',
    failed: 'Ad Set Creation Failed',
  },
  creative: {
    success: 'Creative Created',
    failed: 'Creative Creation Failed',
  },
  image_upload: {
    success: 'Image Upload Complete',
    failed: 'Image Upload Failed',
  },
  video_upload: {
    success: 'Video Upload Complete',
    failed: 'Creative Upload Failed',
  },
  ad: {
    success: 'Ad Created',
    failed: 'Ad Creation Failed',
  },
  publish_complete: {
    success: 'Publish Complete',
    failed: 'Publish Complete Failed',
  },
};

export function publishStageErrorCode(stage: PublishStage): string {
  switch (stage) {
    case 'campaign':
      return 'META_CAMPAIGN_CREATE_FAILED';
    case 'ad_set':
      return 'META_AD_SET_CREATE_FAILED';
    case 'creative':
      return 'META_CREATIVE_CREATE_FAILED';
    case 'image_upload':
      return 'META_IMAGE_UPLOAD_FAILED';
    case 'video_upload':
      return 'META_VIDEO_UPLOAD_FAILED';
    case 'ad':
      return 'META_AD_CREATE_FAILED';
    case 'publish_complete':
      return 'META_PUBLISH_COMPLETE_FAILED';
    default:
      return 'META_PUBLISH_FAILED';
  }
}
