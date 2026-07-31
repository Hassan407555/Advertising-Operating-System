import { CreativeType } from '@prisma/client';

import type { CreativeResponseDto } from '../../../../creatives/dto/creative-response.dto';
import { PublishEntityType } from '../../../enums/publisher.enums';
import type { PublishValidationIssue } from '../../interfaces/publisher-provider.interface';
import type {
  MetaCreativePublishContext,
  MetaCreativePublishStrategy,
} from './creative-publish.strategy';

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/**
 * NONE creatives: no media upload.
 * Prefer existing Meta creative_id / page post (object_story_id),
 * otherwise create a link-only object_story_spec without picture/video.
 */
export class NoneCreativePublishStrategy
  implements MetaCreativePublishStrategy
{
  readonly type = CreativeType.NONE;

  validate(
    creative: CreativeResponseDto,
    _context: MetaCreativePublishContext,
    _adId: string,
  ): PublishValidationIssue[] {
    const issues: PublishValidationIssue[] = [];
    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const existingCreativeId = readMetadataString(
      metadata,
      'existingCreativeId',
      'creative_id',
    );
    const existingPostId = readMetadataString(
      metadata,
      'existingPostId',
      'existing_post_id',
      'object_story_id',
    );

    // Existing Meta creative or page post — no local copy / landing requirements.
    if (existingCreativeId || existingPostId) {
      return issues;
    }

    // Deferred / placeholder path still needs a landing URL for link_data.
    if (!creative.landingPageUrl) {
      issues.push({
        code: 'MISSING_LANDING_URL',
        message:
          'NONE creative without existingCreativeId/existingPostId requires landingPageUrl for a link-only ad.',
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
    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const existingCreativeId = readMetadataString(
      metadata,
      'existingCreativeId',
      'creative_id',
    );
    const existingPostId = readMetadataString(
      metadata,
      'existingPostId',
      'existing_post_id',
      'object_story_id',
    );

    if (context.dryRun) {
      context.stageTracker.mark('image_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'NONE creative — no media upload',
      });
      context.stageTracker.mark('video_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'NONE creative — no media upload',
      });
      return context.stageTracker.run(
        'creative',
        {
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        },
        async () =>
          existingCreativeId ??
          `meta_dry_none_creative_${creative.id}`,
      );
    }

    // Reuse an existing Meta AdCreative as-is.
    if (existingCreativeId) {
      context.stageTracker.mark('image_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: `Using existing Meta creative_id: ${existingCreativeId}`,
      });
      context.stageTracker.mark('video_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'NONE creative — no media upload',
      });
      return context.stageTracker.run(
        'creative',
        {
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        },
        async () => existingCreativeId,
      );
    }

    // Promote an existing Page post via object_story_id.
    if (existingPostId) {
      context.stageTracker.mark('image_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: `Using existing page post object_story_id: ${existingPostId}`,
      });
      context.stageTracker.mark('video_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'NONE creative — no media upload',
      });
      return context.stageTracker.run(
        'creative',
        {
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        },
        async () => {
          const created = await context.metaGraphClient.createAdCreative(
            context.adAccountExternalId,
            context.accessToken,
            {
              name: creative.name,
              object_story_id: existingPostId,
            },
          );
          return created.id;
        },
      );
    }

    // Link-only placeholder creative — no picture / video upload.
    context.stageTracker.mark('image_upload', 'skipped', {
      entityType: PublishEntityType.CREATIVE,
      entityId: creative.id,
      message: 'NONE creative — link-only object_story_spec (no media)',
    });
    context.stageTracker.mark('video_upload', 'skipped', {
      entityType: PublishEntityType.CREATIVE,
      entityId: creative.id,
      message: 'NONE creative — no media upload',
    });

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

        const linkData: Record<string, unknown> = {
          message: creative.primaryText ?? creative.name,
          name: creative.headline ?? creative.name,
          description: creative.description ?? undefined,
          link: creative.landingPageUrl,
          call_to_action: {
            type: ctaType,
            value: {
              link: creative.landingPageUrl,
            },
          },
        };

        const created = await context.metaGraphClient.createAdCreative(
          context.adAccountExternalId,
          context.accessToken,
          {
            name: creative.name,
            object_story_spec: {
              page_id: context.pageId,
              link_data: linkData,
            },
          },
        );

        return created.id;
      },
    );
  }
}
