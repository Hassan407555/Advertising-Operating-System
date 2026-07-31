import type { VideoGenerationRequest } from './video-generation-request.interface';
import type { VideoGenerationResult } from './video-generation-result.interface';

/**
 * Single-implementation provider contract.
 * Swap implementations later without changing VideoGenerationService.
 */
export interface VideoGenerationProvider {
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
}
