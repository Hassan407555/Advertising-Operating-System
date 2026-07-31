import { CreativeType } from '@prisma/client';

import type { CreativeResponseDto } from '../../../../creatives/dto/creative-response.dto';
import { PublishEntityType } from '../../../enums/publisher.enums';
import type { PublishValidationIssue } from '../../interfaces/publisher-provider.interface';
import type {
  MetaCreativePublishContext,
  MetaCreativePublishStrategy,
} from './creative-publish.strategy';

/**
 * IMAGE (and TEXT) creatives: optional picture URL + link_data object_story_spec.
 * Existing IMAGE / TEXT behavior — unchanged.
 */
export class ImageOrTextCreativePublishStrategy
  implements MetaCreativePublishStrategy
{
  constructor(private readonly creativeType: CreativeType) {}

  get type(): CreativeType {
    return this.creativeType;
  }

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

    if (creative.type === CreativeType.IMAGE) {
      const imageUrl = context.resolveImageUrl(creative);
      if (!imageUrl) {
        issues.push({
          code: 'MISSING_IMAGE',
          message:
            'IMAGE creative requires a source image URL in metadata.sourceImageUrls or featuredImageUrl.',
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        });
      }
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
      context.stageTracker.mark('image_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'Dry-run image upload skipped',
      });
      return context.stageTracker.run(
        'creative',
        {
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        },
        async () => `meta_dry_creative_${creative.id}`,
      );
    }

    const imageUrl = context.resolveImageUrl(creative);
    if (imageUrl) {
      context.stageTracker.mark('image_upload', 'succeeded', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: `Using public picture URL (no Meta image upload API): ${imageUrl}`,
      });
    } else {
      context.stageTracker.mark('image_upload', 'skipped', {
        entityType: PublishEntityType.CREATIVE,
        entityId: creative.id,
        message: 'No image URL; text-only creative',
      });
    }

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
          message: creative.primaryText,
          name: creative.headline,
          description: creative.description ?? undefined,
          link: creative.landingPageUrl,
          call_to_action: {
            type: ctaType,
            value: {
              link: creative.landingPageUrl,
            },
          },
        };

        if (imageUrl) {
          linkData.picture = imageUrl;
        }

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
