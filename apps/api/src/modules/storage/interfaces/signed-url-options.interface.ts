/**
 * Options for generating a signed URL.
 */
export interface SignedUrlOptions {
  /**
   * URL expiration time in seconds.
   */
  expiresIn: number;

  /**
   * Force download instead of inline display.
   *
   * Defaults to false.
   */
  download?: boolean;

  /**
   * Suggested filename for downloads.
   *
   * Ignored when download is false.
   */
  fileName?: string;

  /**
   * Optional response content type.
   *
   * Some providers allow overriding the response
   * Content-Type when generating signed URLs.
   */
  contentType?: string;
}