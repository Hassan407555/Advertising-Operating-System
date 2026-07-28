/**
 * Maps raw platform status strings onto our CampaignStatus / AdSetStatus / AdStatus values.
 */
export function mapMetaStatus(externalStatus?: string | null): string | null {
  if (!externalStatus) {
    return null;
  }

  switch (externalStatus.toUpperCase()) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'PAUSED':
    case 'CAMPAIGN_PAUSED':
    case 'ADSET_PAUSED':
    case 'WITH_ISSUES':
      return 'PAUSED';
    case 'DELETED':
      return 'DELETED';
    case 'ARCHIVED':
      return 'ARCHIVED';
    case 'PENDING_REVIEW':
    case 'IN_PROCESS':
      return 'DRAFT';
    default:
      return null;
  }
}

export function mapTikTokStatus(externalStatus?: string | null): string | null {
  if (!externalStatus) {
    return null;
  }

  const normalized = externalStatus.toUpperCase();

  if (
    normalized === 'ENABLE' ||
    normalized === 'STATUS_ENABLE' ||
    normalized === 'STATUS_DELIVERY_OK' ||
    normalized === 'STATUS_ACTIVE'
  ) {
    return 'ACTIVE';
  }

  if (
    normalized === 'DISABLE' ||
    normalized === 'STATUS_DISABLE' ||
    normalized === 'STATUS_DISABLE_BY_QUOTA' ||
    normalized.includes('PAUSE')
  ) {
    return 'PAUSED';
  }

  if (normalized === 'DELETE' || normalized === 'STATUS_DELETE') {
    return 'DELETED';
  }

  return null;
}
