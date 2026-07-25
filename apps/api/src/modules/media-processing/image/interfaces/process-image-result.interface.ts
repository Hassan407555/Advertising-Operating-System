import { ImageProcessingResult } from '../../image/interfaces/image-processing-result.interface';

export interface ProcessImageResult {
  /**
   * Original storage key.
   */
  originalKey: string;

  /**
   * Processing output.
   */
  image: ImageProcessingResult;
}