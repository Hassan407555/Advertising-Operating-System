/**
 * Represents image hashes used for similarity detection.
 */
export interface ImageHashes {
  /**
   * Average hash (aHash).
   */
  averageHash: string;

  /**
   * Difference hash (dHash).
   */
  differenceHash: string;

  /**
   * Perceptual hash (pHash).
   */
  perceptualHash?: string;
}