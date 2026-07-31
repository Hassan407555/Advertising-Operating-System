import { Inject, Injectable } from '@nestjs/common';

import { VIDEO_GENERATION_PROVIDER } from '../constants/video-generation.constants';
import type { VideoGenerationProvider } from '../interfaces/video-generation-provider.interface';
import type { VideoGenerationRequest } from '../interfaces/video-generation-request.interface';
import type { VideoGenerationResult } from '../interfaces/video-generation-result.interface';

/**
 * Orchestrates video generation via the injected provider.
 * Does not know about Shopify, Storage, or Creatives.
 */
@Injectable()
export class VideoGenerationService {
  constructor(
    @Inject(VIDEO_GENERATION_PROVIDER)
    private readonly provider: VideoGenerationProvider,
  ) {}

  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    return this.provider.generate(request);
  }
}
