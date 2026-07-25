/**
 * Represents a generated image variant.
 */
export interface ImageVariant {
  /**
   * Variant name.
   */
  name: string;

  /**
   * Width in pixels.
   */
  width: number;

  /**
   * Height in pixels.
   */
  height: number;

  /**
   * Output format.
   */
  format: string;

  /**
   * Image buffer.
   */
  buffer: Buffer;

  /**
   * File size in bytes.
   */
  size: number;
}