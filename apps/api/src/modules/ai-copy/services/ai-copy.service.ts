import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallToAction, PlatformType } from '@prisma/client';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AiService } from '../../ai/services/ai.service';
import { AdsService } from '../../ads/ads.service';
import type { AdResponseDto } from '../../ads/dto/ad-response.dto';
import { AdSetsService } from '../../ad-sets/services/ad-sets.service';
import { CampaignsService } from '../../campaigns/services/campaigns.service';
import type { CampaignResponseDto } from '../../campaigns/dto/campaign-response.dto';
import { CreativesService } from '../../creatives/creatives.service';
import type { CreativeResponseDto } from '../../creatives/dto/creative-response.dto';
import type { ShopifyProductResponseDto } from '../../shopify/dto/shopify-product-response.dto';
import { ShopifyProductsService } from '../../shopify/services/shopify-products.service';

import {
  AI_COPY_GRAPH_PAGE_LIMIT,
  MARKETING_COPY_JSON_SCHEMA_HINT,
  MARKETING_COPY_PROMPT_TEMPLATE_ID,
} from '../constants/ai-copy.constants';
import { GenerateAiCopyDto } from '../dto/generate-ai-copy.dto';
import {
  GeneratedCreativeCopyDto,
  GenerateAiCopyResponseDto,
} from '../dto/generate-ai-copy-response.dto';
import type { GeneratedMarketingCopy } from '../interfaces/generated-marketing-copy.interface';
import { AiCopyMapper } from '../mappers/ai-copy.mapper';

interface GeneratedCopyWithMeta {
  copy: GeneratedMarketingCopy;
  provider: string;
  model: string;
}

@Injectable()
export class AiCopyService {
  constructor(
    private readonly aiService: AiService,
    private readonly campaignsService: CampaignsService,
    private readonly adSetsService: AdSetsService,
    private readonly adsService: AdsService,
    private readonly creativesService: CreativesService,
    private readonly shopifyProductsService: ShopifyProductsService,
    private readonly mapper: AiCopyMapper,
  ) {}

  async generate(
    dto: GenerateAiCopyDto,
    currentUser: JwtPayload,
  ): Promise<GenerateAiCopyResponseDto> {
    const startedAt = new Date();
    this.assertOrganizationAccess(dto.organizationId, currentUser);

    const campaign = await this.campaignsService.findOne(
      dto.campaignId,
      currentUser,
    );

    const { ads, creatives } = await this.loadCampaignCreatives(
      campaign.id,
      currentUser,
    );

    if (creatives.length === 0) {
      throw new BadRequestException(
        'No creatives found for this campaign. Generate a campaign first.',
      );
    }

    const productsByCreativeId = await this.resolveProductsPerCreative(
      creatives,
      currentUser,
    );

    const generated: GeneratedCreativeCopyDto[] = [];
    let adsProcessed = 0;
    let lastProvider = this.aiService.getActiveProviderName();
    let lastModel: string | undefined;

    // Each creative is processed independently. If execution fails mid-run,
    // already-applied copy remains persisted and a retry can safely continue.
    for (const creative of creatives) {
      const product = productsByCreativeId.get(creative.id);

      if (!product) {
        throw new NotFoundException(
          `No Shopify product resolved for creative ${creative.id}.`,
        );
      }

      const { copy, provider, model } = await this.generateCopyForCreative(
        campaign,
        creative,
        product,
      );

      lastProvider = provider;
      lastModel = model;

      await this.applyCopyToCreative(
        creative,
        copy,
        provider,
        currentUser,
      );

      const relatedAds = ads.filter(
        (ad) => ad.creativeId === creative.id,
      );

      await Promise.all(
        relatedAds.map((ad) =>
          this.applyCopyToAd(ad, copy, currentUser),
        ),
      );

      adsProcessed += relatedAds.length;

      generated.push(
        this.mapper.toGeneratedItem({
          creativeId: creative.id,
          productId: product.id,
          adIds: relatedAds.map((ad) => ad.id),
          copy,
          provider,
          model,
        }),
      );
    }

    const completedAt = new Date();

    return this.mapper.toResponse({
      campaignId: campaign.id,
      creativesProcessed: generated.length,
      adsProcessed,
      execution: {
        provider: lastProvider,
        model: lastModel,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
      generated,
    });
  }

  private assertOrganizationAccess(
    organizationId: string,
    currentUser: JwtPayload,
  ): void {
    if (organizationId !== currentUser.organizationId) {
      throw new BadRequestException(
        'organizationId does not match the authenticated organization.',
      );
    }
  }

  private async loadCampaignCreatives(
    campaignId: string,
    currentUser: JwtPayload,
  ): Promise<{
    ads: AdResponseDto[];
    creatives: CreativeResponseDto[];
  }> {
    const adSetsPage = await this.adSetsService.findAll(
      {
        campaignId,
        page: 1,
        limit: AI_COPY_GRAPH_PAGE_LIMIT,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
      currentUser,
    );

    this.assertPageFullyLoaded(
      'ad sets',
      adSetsPage.meta.total,
      adSetsPage.meta.hasNextPage,
      AI_COPY_GRAPH_PAGE_LIMIT,
    );

    const adsPages = await Promise.all(
      adSetsPage.data.map((adSet) =>
        this.adsService.findAll(
          {
            adSetId: adSet.id,
            page: 1,
            limit: AI_COPY_GRAPH_PAGE_LIMIT,
            sortBy: 'createdAt',
            sortOrder: 'asc',
          },
          currentUser,
        ),
      ),
    );

    const ads: AdResponseDto[] = [];

    for (const adsPage of adsPages) {
      this.assertPageFullyLoaded(
        'ads',
        adsPage.meta.total,
        adsPage.meta.hasNextPage,
        AI_COPY_GRAPH_PAGE_LIMIT,
      );
      ads.push(...adsPage.data);
    }

    const creativeIds = [
      ...new Set(
        ads
          .map((ad) => ad.creativeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const creatives = await Promise.all(
      creativeIds.map((creativeId) =>
        this.creativesService.findOne(creativeId, currentUser),
      ),
    );

    return { ads, creatives };
  }

  private assertPageFullyLoaded(
    entityLabel: string,
    total: number,
    hasNextPage: boolean,
    limit: number,
  ): void {
    if (hasNextPage || total > limit) {
      throw new BadRequestException(
        `Too many ${entityLabel} for this campaign (${total}). ` +
          `AI Copy currently supports at most ${limit} ${entityLabel} per request. ` +
          'Reduce campaign size or split generation.',
      );
    }
  }

  /**
   * Resolves a Shopify product for each creative.
   * Mixed products across creatives are allowed; missing productId is rejected.
   */
  private async resolveProductsPerCreative(
    creatives: CreativeResponseDto[],
    currentUser: JwtPayload,
  ): Promise<Map<string, ShopifyProductResponseDto>> {
    const productIdByCreativeId = new Map<string, string>();
    const missingCreativeIds: string[] = [];

    for (const creative of creatives) {
      const metadata = creative.metadata as
        | Record<string, unknown>
        | null
        | undefined;
      const productId =
        typeof metadata?.productId === 'string'
          ? metadata.productId
          : null;

      if (!productId) {
        missingCreativeIds.push(creative.id);
        continue;
      }

      productIdByCreativeId.set(creative.id, productId);
    }

    if (missingCreativeIds.length > 0) {
      throw new BadRequestException(
        `Missing Shopify productId on creative metadata for: ${missingCreativeIds.join(', ')}.`,
      );
    }

    const uniqueProductIds = [...new Set(productIdByCreativeId.values())];

    const products = await Promise.all(
      uniqueProductIds.map((productId) =>
        this.shopifyProductsService.findOne(productId, currentUser),
      ),
    );

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const result = new Map<string, ShopifyProductResponseDto>();

    for (const [creativeId, productId] of productIdByCreativeId) {
      const product = productsById.get(productId);

      if (!product) {
        throw new NotFoundException(
          `Shopify product ${productId} not found for creative ${creativeId}.`,
        );
      }

      result.set(creativeId, product);
    }

    return result;
  }

  private async generateCopyForCreative(
    campaign: CampaignResponseDto,
    creative: CreativeResponseDto,
    product: ShopifyProductResponseDto,
  ): Promise<GeneratedCopyWithMeta> {
    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const platform =
      (typeof metadata.platform === 'string'
        ? metadata.platform
        : campaign.adAccount?.platform) ?? PlatformType.META;

    const result =
      await this.aiService.generateJsonFromTemplate<GeneratedMarketingCopy>(
        {
          templateId: MARKETING_COPY_PROMPT_TEMPLATE_ID,
          variables: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignObjective: String(campaign.objective),
            platform: String(platform),
            creativeId: creative.id,
            creativeName: creative.name,
            creativeType: String(creative.type),
            country:
              typeof metadata.country === 'string'
                ? metadata.country
                : 'unspecified',
            language:
              typeof metadata.language === 'string'
                ? metadata.language
                : 'en',
            landingPageUrl: creative.landingPageUrl ?? 'unspecified',
            productId: product.id,
            productTitle: product.title,
            productVendor: product.vendor ?? 'unspecified',
            productType: product.productType ?? 'unspecified',
            productTags: product.tags.length
              ? product.tags.join(', ')
              : 'none',
            productDescription: product.description ?? 'none',
            featuredImageUrl: product.featuredImageUrl ?? 'none',
            imageUrls: product.images.length
              ? product.images.map((image) => image.url).join(', ')
              : 'none',
            variantTitles: product.variants.length
              ? product.variants
                  .map((variant) => variant.title)
                  .filter((title): title is string => Boolean(title))
                  .join(', ') || 'none'
              : 'none',
          },
        },
        {
          schemaHint: MARKETING_COPY_JSON_SCHEMA_HINT,
        },
      );

    return {
      copy: this.normalizeCopy(result.data),
      provider: result.provider,
      model: result.model,
    };
  }

  private normalizeCopy(
    data: GeneratedMarketingCopy,
  ): GeneratedMarketingCopy {
    return {
      primaryText: String(data.primaryText ?? ''),
      headline: String(data.headline ?? ''),
      description: String(data.description ?? ''),
      cta: String(data.cta ?? 'Shop Now'),
      ctaEnum: data.ctaEnum,
      suggestedHook: String(data.suggestedHook ?? ''),
      painPoints: Array.isArray(data.painPoints)
        ? data.painPoints.map(String)
        : [],
      benefits: Array.isArray(data.benefits)
        ? data.benefits.map(String)
        : [],
      targetAudienceSummary: String(data.targetAudienceSummary ?? ''),
      offerAngle: String(data.offerAngle ?? ''),
      marketingAngle: String(data.marketingAngle ?? ''),
      platformNotes: String(data.platformNotes ?? ''),
      tone: String(data.tone ?? ''),
    };
  }

  private resolveCallToAction(
    copy: GeneratedMarketingCopy,
  ): CallToAction | undefined {
    if (
      typeof copy.ctaEnum === 'string' &&
      Object.values(CallToAction).includes(copy.ctaEnum as CallToAction)
    ) {
      return copy.ctaEnum as CallToAction;
    }

    const normalized = copy.cta.trim().toUpperCase().replace(/\s+/g, '_');

    if (
      Object.values(CallToAction).includes(normalized as CallToAction)
    ) {
      return normalized as CallToAction;
    }

    return CallToAction.SHOP_NOW;
  }

  private async applyCopyToCreative(
    creative: CreativeResponseDto,
    copy: GeneratedMarketingCopy,
    provider: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const existingMetadata =
      (creative.metadata as Record<string, unknown> | null) ?? {};
    const callToAction = this.resolveCallToAction(copy);
    const existingAiCopy = this.extractAiCopyMetadata(existingMetadata);

    if (
      creative.headline === copy.headline &&
      creative.primaryText === copy.primaryText &&
      creative.description === copy.description &&
      (callToAction ? creative.callToAction === callToAction : true) &&
      existingAiCopy?.cta === copy.cta &&
      existingAiCopy?.suggestedHook === copy.suggestedHook &&
      existingAiCopy?.targetAudienceSummary === copy.targetAudienceSummary &&
      existingAiCopy?.offerAngle === copy.offerAngle &&
      existingAiCopy?.marketingAngle === copy.marketingAngle &&
      existingAiCopy?.platformNotes === copy.platformNotes &&
      existingAiCopy?.tone === copy.tone &&
      existingAiCopy?.provider === provider
    ) {
      return;
    }

    await this.creativesService.update(
      creative.id,
      {
        version: creative.version,
        headline: copy.headline,
        primaryText: copy.primaryText,
        description: copy.description,
        ...(callToAction ? { callToAction } : {}),
        metadata: {
          ...existingMetadata,
          aiCopy: {
            cta: copy.cta,
            suggestedHook: copy.suggestedHook,
            painPoints: copy.painPoints,
            benefits: copy.benefits,
            targetAudienceSummary: copy.targetAudienceSummary,
            offerAngle: copy.offerAngle,
            marketingAngle: copy.marketingAngle,
            platformNotes: copy.platformNotes,
            tone: copy.tone,
            generatedAt: new Date().toISOString(),
            provider,
          },
        },
      },
      currentUser,
    );
  }

  private async applyCopyToAd(
    ad: AdResponseDto,
    copy: GeneratedMarketingCopy,
    currentUser: JwtPayload,
  ): Promise<void> {
    const existingMetadata =
      (ad.metadata as Record<string, unknown> | null) ?? {};
    const existingAiCopy = this.extractAiCopyMetadata(existingMetadata);

    if (
      existingAiCopy?.headline === copy.headline &&
      existingAiCopy?.primaryText === copy.primaryText &&
      existingAiCopy?.description === copy.description &&
      existingAiCopy?.cta === copy.cta
    ) {
      return;
    }

    await this.adsService.update(
      ad.id,
      {
        version: ad.version,
        metadata: {
          ...existingMetadata,
          aiCopy: {
            headline: copy.headline,
            primaryText: copy.primaryText,
            description: copy.description,
            cta: copy.cta,
            generatedAt: new Date().toISOString(),
          },
        },
      },
      currentUser,
    );
  }

  private extractAiCopyMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const aiCopy = metadata.aiCopy;
    if (!aiCopy || typeof aiCopy !== 'object') {
      return null;
    }
    return aiCopy as Record<string, unknown>;
  }
}
