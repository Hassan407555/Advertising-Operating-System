import { Injectable } from '@nestjs/common';

import { FfmpegVideoRenderEngine } from '../engines/ffmpeg-video-render.engine';
import type { VideoGenerationProvider } from '../interfaces/video-generation-provider.interface';
import type { VideoGenerationRequest } from '../interfaces/video-generation-request.interface';
import type { VideoGenerationResult } from '../interfaces/video-generation-result.interface';

/**
 * V1 product showcase provider.
 * Orchestrates a simple product ad; rendering is delegated to FfmpegVideoRenderEngine.
 * Swap this provider later (Veo / Runway / OpenAI) without changing VideoGenerationService.
 */
@Injectable()
export class SimpleVideoProvider implements VideoGenerationProvider {
  constructor(private readonly renderEngine: FfmpegVideoRenderEngine) {}

  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    return this.renderEngine.renderProductShowcase(request);
  }
}
