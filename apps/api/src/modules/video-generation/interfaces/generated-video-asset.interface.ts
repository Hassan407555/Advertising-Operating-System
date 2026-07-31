import type { StorageProvider } from '@prisma/client';

/**
 * Stored video descriptor kept on the AI session until Save Draft
 * links a CreativeAsset to the draft Creative.
 */
export interface GeneratedVideoAsset {
  url: string;
  storageKey: string;
  storageProvider: StorageProvider;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  extension: string;
  fileSize: number;
  checksum?: string;
  durationSeconds: number;
  width: number;
  height: number;
  thumbnailUrl?: string | null;
}
