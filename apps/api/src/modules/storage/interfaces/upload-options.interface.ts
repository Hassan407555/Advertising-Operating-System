import { StorageVisibility } from '../enums/storage-visibility.enum';

/**
 * Additional options for a storage upload operation.
 */
export interface UploadOptions {
  /**
   * Destination directory relative to the storage root.
   */
  directory?: string;

  /**
   * Custom filename.
   *
   * If omitted, the provider generates a unique filename.
   */
  fileName?: string;

  /**
   * MIME type of the uploaded file.
   */
  mimeType: string;

  /**
   * Visibility of the stored object.
   */
  visibility?: StorageVisibility;

  /**
   * Optional provider-specific metadata.
   */
  metadata?: Record<string, string>;

  /**
   * Overwrite an existing object if it already exists.
   *
   * Defaults to false.
   */
  overwrite?: boolean;

  /**
   * Cache-Control header for providers that support it.
   */
  cacheControl?: string;

  /**
   * Content-Disposition header for providers that support it.
   */
  contentDisposition?: string;
}