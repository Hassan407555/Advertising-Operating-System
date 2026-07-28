export type PublisherPlatform = "META" | "TIKTOK" | "GOOGLE" | "LINKEDIN";
export type PublishStatus = "PENDING" | "VALIDATED" | "PUBLISHED" | "PARTIAL" | "FAILED" | "SKIPPED";
export type PublishEntityType = "CAMPAIGN" | "AD_SET" | "AD" | "CREATIVE";

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
