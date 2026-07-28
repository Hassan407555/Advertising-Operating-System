import {
  SyncChangeType,
  SyncEntityType,
  SyncStatus,
  SynchronizationPlatform,
} from '../../enums/synchronization.enums';

export interface SyncMetricsSnapshot {
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  reach?: number | null;
  cpm?: number | null;
  cpc?: number | null;
  ctr?: number | null;
}

export interface SyncEntityState {
  entityType: SyncEntityType;
  entityId: string;
  externalId?: string | null;
  /** Raw platform status string */
  externalStatus?: string | null;
  /** Mapped internal status when applicable */
  status?: string | null;
  name?: string | null;
  metrics?: SyncMetricsSnapshot;
  remoteDeleted?: boolean;
  raw?: unknown;
}

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

export interface SyncRequest {
  organizationId: string;
  platform: SynchronizationPlatform;
  adAccountId?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  options?: Record<string, unknown>;
  requestedByUserId?: string;
}

export interface SyncResult {
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
  raw?: unknown;
}

/**
 * Contract every advertising platform sync adapter must implement.
 * Business modules never call providers directly — use SynchronizationService.
 */
export interface SynchronizationProvider {
  readonly platform: SynchronizationPlatform;

  syncCampaign(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }>;

  syncAdSet(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }>;

  syncAd(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }>;

  syncAccount(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }>;
}
