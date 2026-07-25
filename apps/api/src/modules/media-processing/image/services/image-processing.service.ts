import { Injectable } from '@nestjs/common';

import { performance } from 'node:perf_hooks';

import { ImageMetadataService } from './image-metadata.service';
import { ImageValidationService } from './image-validation.service';
import { ImageOptimizationService } from './image-optimization.service';
import { ImageVariantService } from './image-variant.service';
import { ImageAnalysisService } from './image-analysis.service';

import { ImageProcessingResult } from '../interfaces/image-processing-result.interface';

@Injectable()
export class ImageProcessingService {
  constructor(
    private readonly metadataService: ImageMetadataService,
    private readonly validationService: ImageValidationService,
    private readonly optimizationService: ImageOptimizationService,
    private readonly variantService: ImageVariantService,
    private readonly analysisService: ImageAnalysisService,
  ) {}

  /**
   * Execute the complete image processing pipeline.
   */
  async process(
    buffer: Buffer,
  ): Promise<ImageProcessingResult> {
    const started = performance.now();

    const validation =
      await this.validationService.validate(buffer);

    if (!validation.valid) {
      return {
        metadata: await this.metadataService.extract(buffer),
        validation,
        variants: [],
        analysis: await this.analysisService.analyze(buffer),
        processingTime: performance.now() - started,
      };
    }

    const optimized =
      await this.optimizationService.optimize(buffer);

    return {
      metadata:
        await this.metadataService.extract(optimized),

      validation,

      variants:
        await this.variantService.generate(optimized),

      analysis:
        await this.analysisService.analyze(optimized),

      processingTime:
        performance.now() - started,
    };
  }
}