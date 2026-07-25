/**
 * Supported resize fit modes.
 */
export type ImageResizeFit =
  | 'cover'
  | 'contain'
  | 'fill'
  | 'inside'
  | 'outside';

/**
 * Image transformation options.
 */
export interface ImageTransformOptions {
  /**
   * Output width.
   */
  width?: number;

  /**
   * Output height.
   */
  height?: number;

  /**
   * Resize fit strategy.
   */
  fit?: ImageResizeFit;

  /**
   * Prevent enlargement.
   */
  withoutEnlargement?: boolean;

  /**
   * JPEG/WebP/AVIF quality.
   */
  quality?: number;

  /**
   * Output format.
   */
  format?: string;

  /**
   * Rotation angle.
   */
  rotate?: number;

  /**
   * Flip vertically.
   */
  flip?: boolean;

  /**
   * Flip horizontally.
   */
  flop?: boolean;

  /**
   * Blur radius.
   */
  blur?: number;

  /**
   * Sharpen image.
   */
  sharpen?: boolean;

  /**
   * Convert to grayscale.
   */
  grayscale?: boolean;

  /**
   * Preserve metadata.
   */
  preserveMetadata?: boolean;
}