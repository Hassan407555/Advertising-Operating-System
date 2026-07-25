/**
 * RGB color information.
 */
export interface ImageColor {
  hex: string;
  red: number;
  green: number;
  blue: number;
  percentage: number;
}

/**
 * Image analysis result.
 */
export interface ImageAnalysis {
  /**
   * Dominant colors.
   */
  dominantColors: ImageColor[];

  /**
   * Average color.
   */
  averageColor: string;

  /**
   * BlurHash representation.
   */
  blurHash?: string;

  /**
   * Perceptual hash.
   */
  perceptualHash?: string;
}