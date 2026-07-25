import { Module } from '@nestjs/common';

import { ImageMetadataService } from './services/image-metadata.service';
import { ImageValidationService } from './services/image-validation.service';
import { ImageVariantService } from './services/image-variant.service';
import { ImageOptimizationService } from './services/image-optimization.service';
import { ImageTransformService } from './services/image-transform.service';
import { ImageAnalysisService } from './services/image-analysis.service';
import { ImageProcessingService } from './services/image-processing.service';
import { ImageHashService } from './services/image-hash.service';
@Module({
  providers: [
    ImageMetadataService,
    ImageValidationService,
    ImageVariantService,
    ImageOptimizationService,
    ImageTransformService,
    ImageAnalysisService,
    ImageHashService,
    ImageProcessingService,
  ],
  exports: [
    ImageMetadataService,
    ImageValidationService,
    ImageVariantService,
    ImageOptimizationService,
    ImageTransformService,
    ImageHashService,
    ImageAnalysisService,
    ImageProcessingService,
  ],
})
export class ImageModule {}