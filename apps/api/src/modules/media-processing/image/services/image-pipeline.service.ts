import { Injectable } from '@nestjs/common';

import { ImageProcessingService } from '../../image/services/image-processing.service';

import { ProcessImageRequest } from '../interfaces/process-image-request.interface';
import { ProcessImageResult } from '../interfaces/process-image-result.interface';

/**
 * Coordinates the complete image processing workflow.
 *
 * This service will become the single entry point for
 * image ingestion across the platform.
 */
@Injectable()
export class ImagePipelineService {
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Process an uploaded image.
   */
  async process(
    request: ProcessImageRequest,
  ): Promise<ProcessImageResult> {
    const result =
      await this.imageProcessingService.process(
        request.buffer,
      );

    return {
      originalKey: '',
      image: result,
    };
  }
}