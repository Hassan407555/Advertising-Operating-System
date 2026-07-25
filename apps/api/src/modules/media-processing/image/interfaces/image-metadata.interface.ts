/**
 * Comprehensive metadata extracted from an image.
 *
 * This interface represents the canonical metadata model used
 * throughout the media processing pipeline.
 */
export interface ImageMetadata {
  /**
   * Image width in pixels.
   */
  width: number;

  /**
   * Image height in pixels.
   */
  height: number;

  /**
   * Image format.
   *
   * Example:
   * jpeg
   * png
   * webp
   * avif
   * gif
   * tiff
   */
  format: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * Number of image channels.
   */
  channels: number;

  /**
   * Color space.
   *
   * Example:
   * srgb
   * rgb16
   * cmyk
   */
  colorSpace: string;

  /**
   * DPI (pixels per inch).
   */
  density?: number;

  /**
   * EXIF orientation.
   */
  orientation?: number;

  /**
   * Whether the image contains an alpha channel.
   */
  hasAlpha: boolean;

  /**
   * Whether the image is animated.
   */
  isAnimated: boolean;

  /**
   * Number of pages/frames.
   */
  pages?: number;

  /**
   * Page height for animated images.
   */
  pageHeight?: number;

  /**
   * Whether EXIF metadata exists.
   */
  hasExif: boolean;

  /**
   * Whether an embedded ICC profile exists.
   */
  hasIccProfile: boolean;

  /**
   * Whether XMP metadata exists.
   */
  hasXmp: boolean;

  /**
   * Whether IPTC metadata exists.
   */
  hasIptc: boolean;
}