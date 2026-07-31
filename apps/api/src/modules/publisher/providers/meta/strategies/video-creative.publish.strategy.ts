import { CreativeType } from '@prisma/client';

import type { CreativeResponseDto } from '../../../../creatives/dto/creative-response.dto';
import { PublishEntityType } from '../../../enums/publisher.enums';
import type { PublishValidationIssue } from '../../interfaces/publisher-provider.interface';
import type {
  MetaCreativePublishContext,
  MetaCreativePublishStrategy,
} from './creative-publish.strategy';

/**
 * VIDEO creatives: upload video by URL, then video_data object_story_spec.
 * Existing VIDEO behavior — unchanged.
 */
export class VideoCreativePublishStrategy
  implements MetaCreativePublishStrategy
{
  readonly type = CreativeType.VIDEO;

  validate(
    creative: CreativeResponseDto,
    context: MetaCreativePublishContext,
    _adId: string,
  ): PublishValidationIssue[] {
    const issues: PublishValidationIssue[] = [];

    if (!creative.headline?.trim() || !creative.primaryText?.trim()) {
      issues.push({
        code: 'MISSING_AI_COPY',
        message:
          'Creative is missing headline or primaryText. Run AI Copy generation first.',
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
      });
    }

    const video = context.videoByCreativeId.get(creative.id);
    if (!video) {
      issues.push({
        code: 'MISSING_VIDEO',
        message:
          'VIDEO creative requires a CreativeAsset (VIDEO) or metadata.sourceVideoUrls / videoUrl with a reachable Storage URL.',
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
      });
    } else if (!context.supportedVideoMimeTypes.includes(video.mimeType)) {
      issues.push({
        code: 'UNSUPPORTED_VIDEO_FORMAT',
        message: `Unsupported video MIME type ${video.mimeType}. Supported: ${context.supportedVideoMimeTypes.join(', ')}.`,
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        field: 'mimeType',
      });
    }

    if (!creative.landingPageUrl) {
      issues.push({
        code: 'MISSING_LANDING_URL',
        message: 'Creative is missing landingPageUrl.',
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        field: 'landingPageUrl',
      });
    }

    return issues;
  }

  async publish(
    creative: CreativeResponseDto,
    context: MetaCreativePublishContext,
  ): Promise<string> {
    if (context.dryRun) {
      context.stageTracker.mark('video_upload', 'succeeded', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'Dry-run video upload skipped',
      });
      return context.stageTracker.run(
        'creative',
        {
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        },
        async () => `meta_dry_video_creative_${creative.id}`,
      );
    }

    const video = context.videoByCreativeId.get(creative.id);
    if (!video) {
      throw new Error(`Missing video media for creative ${creative.id}.`);
    }

    const uploaded = await context.stageTracker.run(
      'video_upload',
      {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: `Uploading video by URL: ${video.url}`,
      },
      async () =>
        context.metaGraphClient.uploadVideoByUrl(
          context.adAccountExternalId,
          context.accessToken,
          video.url,
          creative.name,
        ),
    );

    return context.stageTracker.run(
      'creative',
      {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
      },
      async () => {
        const ctaType =
          context.ctaMap[creative.callToAction ?? context.defaultCta] ??
          'SHOP_NOW';

        const videoData: Record<string, unknown> = {
          video_id: uploaded.id,
          message: creative.primaryText,
          title: creative.headline,
          call_to_action: {
            type: ctaType,
            value: {
              link: creative.landingPageUrl,
            },
          },
        };

        if (video.thumbnailUrl) {
          videoData.image_url = video.thumbnailUrl;
        }

        const created = await context.metaGraphClient.createAdCreative(
          context.adAccountExternalId,
          context.accessToken,
          {
            name: creative.name,
            object_story_spec: {
              page_id: context.pageId,
              video_data: videoData,
            },
          },
        );

        return created.id;
      },
    );
  }
}
