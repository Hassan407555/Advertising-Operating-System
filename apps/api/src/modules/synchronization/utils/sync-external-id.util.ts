import { SYNC_LOCAL_EXTERNAL_ID_PREFIXES } from '../constants/synchronization.constants';

export function isLocalExternalId(externalId?: string | null): boolean {
  if (!externalId) {
    return true;
  }

  return SYNC_LOCAL_EXTERNAL_ID_PREFIXES.some((prefix) =>
    externalId.startsWith(prefix),
  );
}
