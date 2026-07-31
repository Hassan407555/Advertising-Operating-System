import type { CallToAction, CreativeType } from '@prisma/client';

import type { CreativeResponseDto } from '../../../../creatives/dto/creative-response.dto';
import type { PublishValidationIssue } from '../../interfaces/publisher-provider.interface';
import type { PublishStageTracker } from '../publish-stage-tracker';
import type { MetaGraphClient } from '../meta-graph.client';

export interface ResolvedVideoMedia {
  url: string;
  mimeType: string;
  thumbnailUrl: string | null;
}

/**
 * Shared context for Meta creative publish strategies.
 * Kept intentionally narrow so strategies stay independent of the full provider.
 */
export interface MetaCreativePublishContext {
  adAccountExternalId: string;
  accessToken: string;
  pageId: string | null;
  dryRun: boolean;
  videoByCreativeId: Map<string, ResolvedVideoMedia>;
  stageTracker: PublishStageTracker;
  metaGraphClient: MetaGraphClient;
  resolveImageUrl: (creative: CreativeResponseDto) => string | null;
  ctaMap: Record<string, string>;
  defaultCta: CallToAction;
  supportedVideoMimeTypes: readonly string[];
}

export interface MetaCreativePublishStrategy {
  readonly type: CreativeType;

  validate(
    creative: CreativeResponseDto,
    context: MetaCreativePublishContext,
    adId: string,
  ): PublishValidationIssue[];

  publish(
    creative: CreativeResponseDto,
    context: MetaCreativePublishContext,
  ): Promise<string>;
}
