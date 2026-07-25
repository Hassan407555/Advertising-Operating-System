import { ImageProcessingResult } from '../../image/interfaces/image-processing-result.interface';

/**
 * Result of an image pipeline execution.
 */
export interface ProcessImageResult {
  /**
   * Storage key of the original image.
   */
  originalKey: string;

  /**
   * Image processing result.
   */
  image: ImageProcessingResult;
}