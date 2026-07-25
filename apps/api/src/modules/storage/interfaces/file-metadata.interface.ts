/**
 * Metadata returned by a storage provider.
 */
export interface FileMetadata {
  /**
   * Unique storage key.
   */
  storageKey: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * MIME type.
   */
  mimeType: string;

  /**
   * File extension without leading dot.
   */
  extension: string;

  /**
   * Last modification timestamp.
   */
  lastModified: Date;

  /**
   * SHA-256 checksum or provider ETag.
   *
   * Not every provider guarantees this value.
   */
  checksum?: string;

  /**
   * Whether the object currently exists.
   */
  exists: boolean;

  /**
   * Provider-specific metadata.
   */
  metadata?: Record<string, unknown>;
}