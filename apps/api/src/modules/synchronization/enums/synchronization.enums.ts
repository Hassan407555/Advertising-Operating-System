export enum SynchronizationPlatform {
  META = 'META',
  TIKTOK = 'TIKTOK',
}

export enum SyncEntityType {
  ORGANIZATION = 'ORGANIZATION',
  AD_ACCOUNT = 'AD_ACCOUNT',
  CAMPAIGN = 'CAMPAIGN',
  AD_SET = 'AD_SET',
  AD = 'AD',
}

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum SyncChangeType {
  UPDATED = 'UPDATED',
  UNCHANGED = 'UNCHANGED',
  REMOTE_DELETED = 'REMOTE_DELETED',
  NOT_PUBLISHED = 'NOT_PUBLISHED',
  FAILED = 'FAILED',
}
