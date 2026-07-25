import { ImageAnalysis } from './image-analysis.interface';
import { ImageMetadata } from './image-metadata.interface';
import { ImageValidationResult } from './image-validation.interface';
import { ImageVariant } from './image-variant.interface';

export interface ImageProcessingResult {
  metadata: ImageMetadata;

  validation: ImageValidationResult;

  variants: ImageVariant[];

  analysis: ImageAnalysis;

  processingTime: number;
}