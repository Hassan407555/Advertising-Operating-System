export const PLATFORM_CREDENTIAL_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'expiresAt',
  'rotatedAt',
  'revokedAt',
  'version',
] as const;

export type PlatformCredentialSortField =
  (typeof PLATFORM_CREDENTIAL_SORT_FIELDS)[number];

export const PLATFORM_CREDENTIAL_DEFAULT_PAGE = 1;

export const PLATFORM_CREDENTIAL_DEFAULT_LIMIT = 20;

export const PLATFORM_CREDENTIAL_MAX_LIMIT = 100;

export const PLATFORM_CREDENTIAL_DEFAULT_SORT_BY: PlatformCredentialSortField =
  'createdAt';

export const PLATFORM_CREDENTIAL_DEFAULT_SORT_ORDER = 'desc' as const;