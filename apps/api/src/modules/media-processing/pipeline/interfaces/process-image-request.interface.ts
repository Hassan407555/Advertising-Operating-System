/**
 * Request for processing an uploaded image.
 */
export interface ProcessImageRequest {
  /**
   * Uploaded image buffer.
   */
  buffer: Buffer;

  /**
   * Original filename.
   */
  filename: string;

  /**
   * MIME type.
   */
  mimeType: string;

  /**
   * Storage location prefix.
   *
   * Example:
   * organizations/org_123/assets
   */
  storagePrefix: string;

  /**
   * Generate image variants.
   */
  generateVariants?: boolean;

  /**
   * Run image analysis.
   */
  analyze?: boolean;
}