import { Injectable } from '@nestjs/common';

import { ImageProcessingService } from '../../image/services/image-processing.service';

import { ProcessImageRequest } from '../interfaces/process-image-request.interface';
import { ProcessImageResult } from '../interfaces/process-image-result.interface';

@Injectable()
export class ImagePipelineService {
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async process(
    request: ProcessImageRequest,
  ): Promise<ProcessImageResult> {
    const image = await this.imageProcessingService.process(
      request.buffer,
    );

    return {
      originalKey: '',
      image,
    };
  }
}