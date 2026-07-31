export type PublisherPlatform = "META" | "TIKTOK" | "GOOGLE" | "LINKEDIN";
export type PublishStatus = "PENDING" | "VALIDATED" | "PUBLISHED" | "PARTIAL" | "FAILED" | "SKIPPED";
export type PublishEntityType = "CAMPAIGN" | "AD_SET" | "AD" | "CREATIVE";

export type PublishStage =
  | "campaign"
  | "ad_set"
  | "creative"
  | "image_upload"
  | "video_upload"
  | "ad"
  | "publish_complete";

export type PublishStageStatus = "started" | "succeeded" | "failed" | "skipped";

export interface PublishValidationIssue {
  code: string;
  message: string;
  entityType?: PublishEntityType;
  entityId?: string;
  field?: string;
}

export interface PublishValidationResponse {
  valid: boolean;
  platform: PublisherPlatform;
  issues: PublishValidationIssue[];
}

export interface PublishEntityResult {
  entityType: PublishEntityType;
  entityId: string;
  externalId?: string;
  status: PublishStatus;
  message?: string;
}

export interface MetaGraphErrorDetails {
  message: string;
  httpStatus: number;
  code?: number;
  errorSubcode?: number;
  type?: string;
  fbtraceId?: string;
  path?: string;
  raw?: unknown;
}

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

export interface PublishCampaignResponse {
  success: boolean;
  platform: PublisherPlatform;
  status: PublishStatus;
  campaignId: string;
  externalCampaignId?: string;
  entities: PublishEntityResult[];
  issues: PublishValidationIssue[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  diagnostics?: PublishDiagnostics;
}

export interface PublisherPlatformsResponse {
  registered: PublisherPlatform[];
  roadmap: PublisherPlatform[];
}

export interface PublishCampaignPayload {
  campaignId: string;
  organizationId: string;
  platform: PublisherPlatform;
  adAccountId: string;
  entityIds?: {
    adSetIds?: string[];
    adIds?: string[];
    creativeIds?: string[];
  };
  options?: Record<string, unknown>;
}

export const PUBLISH_STAGE_TITLES: Record<
  PublishStage,
  { success: string; failed: string }
> = {
  campaign: {
    success: "Campaign Created",
    failed: "Campaign Creation Failed",
  },
  ad_set: {
    success: "Ad Set Created",
    failed: "Ad Set Creation Failed",
  },
  creative: {
    success: "Creative Created",
    failed: "Creative Creation Failed",
  },
  image_upload: {
    success: "Image Upload Complete",
    failed: "Image Upload Failed",
  },
  video_upload: {
    success: "Video Upload Complete",
    failed: "Creative Upload Failed",
  },
  ad: {
    success: "Ad Created",
    failed: "Ad Creation Failed",
  },
  publish_complete: {
    success: "Publish Complete",
    failed: "Publish Complete Failed",
  },
};

export function getPublishFailureTitle(diagnostics?: PublishDiagnostics): string {
  if (!diagnostics?.stage) {
    return "Publish Failed";
  }
  return PUBLISH_STAGE_TITLES[diagnostics.stage]?.failed ?? "Publish Failed";
}

export function getPublishFailureToastMessage(
  result: PublishCampaignResponse,
): string {
  const diagnostics = result.diagnostics;
  const title = getPublishFailureTitle(diagnostics);
  const detail =
    diagnostics?.errorMessage?.trim() ||
    result.issues.find((issue) => issue.message.trim())?.message.trim();

  if (detail) {
    return `${title}: ${detail}`;
  }

  return `${title} (status: ${result.status})`;
}
