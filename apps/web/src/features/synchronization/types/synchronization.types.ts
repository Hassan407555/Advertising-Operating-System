export type SynchronizationPlatform = "META" | "TIKTOK";
export type SyncEntityType = "ORGANIZATION" | "AD_ACCOUNT" | "CAMPAIGN" | "AD_SET" | "AD";
export type SyncStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
export type SyncChangeType = "UPDATED" | "UNCHANGED" | "REMOTE_DELETED" | "NOT_PUBLISHED" | "FAILED";

export interface SyncEntityResult {
  entityType: SyncEntityType;
  entityId: string;
  externalId?: string | null;
  changeType: SyncChangeType;
  fieldsUpdated: string[];
  message?: string;
}

export interface SyncIssue {
  code: string;
  message: string;
  entityType?: SyncEntityType;
  entityId?: string;
  field?: string;
}

export interface SyncResultResponse {
  success: boolean;
  platform: SynchronizationPlatform;
  status: SyncStatus;
  scope: SyncEntityType;
  scopeId: string;
  entities: SyncEntityResult[];
  issues: SyncIssue[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface SyncEntityStatus {
  id: string;
  name: string;
  externalId: string;
  externalStatus?: string | null;
  status: string;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  lastSyncedAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
}

export interface CampaignSyncStatusResponse {
  campaignId: string;
  name: string;
  platform: SynchronizationPlatform;
  externalId: string;
  externalStatus?: string | null;
  status: string;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  lastSyncedAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  adSets: Array<
    SyncEntityStatus & {
      ads: SyncEntityStatus[];
    }
  >;
}
