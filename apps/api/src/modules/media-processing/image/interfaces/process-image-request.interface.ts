export interface ProcessImageRequest {
  /**
   * Original uploaded file.
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
   * Storage prefix.
   *
   * Example:
   * organizations/org_123/assets
   */
  storagePrefix: string;

  /**
   * Generate variants.
   */
  generateVariants?: boolean;

  /**
   * Run analysis.
   */
  analyze?: boolean;
}