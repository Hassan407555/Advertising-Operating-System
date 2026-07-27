import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  CreativeType,
  Currency,
  PlatformType,
} from '@prisma/client';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AdAccountsService } from '../../ad-accounts/ad-accounts.service';
import { AdsService } from '../../ads/ads.service';
import { AdSetsService } from '../../ad-sets/services/ad-sets.service';
import { CampaignsService } from '../../campaigns/services/campaigns.service';
import { CreativesService } from '../../creatives/creatives.service';
import { ShopifyProductResponseDto } from '../../shopify/dto/shopify-product-response.dto';
import { ShopifyProductsService } from '../../shopify/services/shopify-products.service';
import { ShopifyService } from '../../shopify/services/shopify.service';

import {
  CAMPAIGN_GENERATOR_SUPPORTED_PLATFORMS,
  CREATIVE_ASPECT_RATIOS,
  DEFAULT_CALL_TO_ACTION,
  MARKETING_GOAL_TO_OBJECTIVE,
  PLATFORM_OPTIMIZATION_GOALS,
  PLATFORM_PLACEMENTS,
  type CampaignGeneratorPlatform,
} from '../constants/campaign-generator.constants';
import { GenerateCampaignDto } from '../dto/generate-campaign.dto';
import { GenerateCampaignResponseDto } from '../dto/generate-campaign-response.dto';
import type { GenerateCampaignResult } from '../interfaces/generate-campaign-result.interface';

@Injectable()
export class CampaignGeneratorService {
  constructor(
    private readonly shopifyProductsService: ShopifyProductsService,
    private readonly shopifyService: ShopifyService,
    private readonly adAccountsService: AdAccountsService,
    private readonly campaignsService: CampaignsService,
    private readonly adSetsService: AdSetsService,
    private readonly creativesService: CreativesService,
    private readonly adsService: AdsService,
  ) {}

  async generate(
    dto: GenerateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<GenerateCampaignResponseDto> {
    const platforms = this.validatePlatforms(dto.platforms);
    await this.validateAdAccounts(platforms, dto, currentUser);

    const product = await this.shopifyProductsService.findOne(
      dto.productId,
      currentUser,
    );

    const store = await this.shopifyService.getStore(currentUser);
    const destinationUrl = this.buildDestinationUrl(
      store.shop,
      product.handle,
    );

    const objective = MARKETING_GOAL_TO_OBJECTIVE[dto.marketingGoal];
    const currency = dto.currency ?? Currency.USD;
    const callToAction =
      dto.preferences?.callToAction ?? DEFAULT_CALL_TO_ACTION;
    const creativeType = this.resolveCreativeType(dto, product);
    const platformBudget = this.splitBudget(
      dto.dailyBudget,
      platforms.length,
    );
    const namePrefix =
      dto.preferences?.campaignNamePrefix?.trim() ||
      product.title;

    const result: GenerateCampaignResult = {
      campaigns: [],
      adSets: [],
      ads: [],
      creatives: [],
    };

    for (const platform of platforms) {
      const adAccountId = this.requireAdAccountId(platform, dto);
      const campaignName = `${namePrefix} — ${platform}`;

      const campaign = await this.campaignsService.create(
        {
          adAccountId,
          name: campaignName,
          objective,
          dailyBudget: platformBudget,
          currency,
        },
        currentUser,
      );

      result.campaigns.push({
        id: campaign.id,
        platform,
        name: campaign.name,
      });

      const adSetBudget = this.splitBudget(
        platformBudget,
        dto.countries.length,
      );

      for (const country of dto.countries) {
        const normalizedCountry = country.trim().toUpperCase();
        const adSetName = `${campaignName} — ${normalizedCountry}`;

        const adSet = await this.adSetsService.create(
          {
            campaignId: campaign.id,
            name: adSetName,
            dailyBudget: adSetBudget,
            targeting: {
              countries: [normalizedCountry],
              language: dto.language,
            },
            metadata: {
              platform,
              country: normalizedCountry,
              language: dto.language,
              placements: PLATFORM_PLACEMENTS[platform],
              optimizationGoal: PLATFORM_OPTIMIZATION_GOALS[platform],
            },
          },
          currentUser,
        );

        result.adSets.push({
          id: adSet.id,
          campaignId: campaign.id,
          platform,
          country: normalizedCountry,
          name: adSet.name,
        });

        const creativeName = `${product.title} — ${platform} — ${normalizedCountry}`;

        const creative = await this.creativesService.create(
          {
            name: creativeName,
            type: creativeType,
            callToAction,
            ...(destinationUrl
              ? { landingPageUrl: destinationUrl }
              : {}),
            metadata: {
              platform,
              country: normalizedCountry,
              language: dto.language,
              productId: product.id,
              sourceImageUrls: product.images.map((image) => image.url),
              featuredImageUrl: product.featuredImageUrl,
              aspectRatios: CREATIVE_ASPECT_RATIOS[creativeType] ?? [],
              placements: PLATFORM_PLACEMENTS[platform],
              requiredImages: creativeType === CreativeType.VIDEO ? 0 : 1,
              requiredVideos: creativeType === CreativeType.VIDEO ? 1 : 0,
              assetRecommendations: [
                'Use product featured image as primary creative',
                'AI copy and media processing will fill this placeholder later',
              ],
            },
          },
          currentUser,
        );

        result.creatives.push({
          id: creative.id,
          type: creative.type,
          name: creative.name,
        });

        const adName = `${product.title} — ${normalizedCountry}`;

        const ad = await this.adsService.create(
          {
            adSetId: adSet.id,
            creativeId: creative.id,
            name: adName,
          },
          currentUser,
        );

        result.ads.push({
          id: ad.id,
          adSetId: adSet.id,
          name: ad.name,
        });
      }
    }

    return result;
  }

  private validatePlatforms(
    platforms: PlatformType[],
  ): CampaignGeneratorPlatform[] {
    const unique = [...new Set(platforms)];

    for (const platform of unique) {
      if (
        !CAMPAIGN_GENERATOR_SUPPORTED_PLATFORMS.includes(
          platform as CampaignGeneratorPlatform,
        )
      ) {
        throw new BadRequestException(
          `Unsupported platform: ${platform}. Only META and TIKTOK are supported.`,
        );
      }
    }

    return unique as CampaignGeneratorPlatform[];
  }

  private async validateAdAccounts(
    platforms: CampaignGeneratorPlatform[],
    dto: GenerateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<void> {
    for (const platform of platforms) {
      const adAccountId = this.requireAdAccountId(platform, dto);

      const adAccount = await this.adAccountsService.findOne(
        adAccountId,
        currentUser,
      );

      if (adAccount.platform !== platform) {
        throw new BadRequestException(
          `Ad account ${adAccountId} is not a ${platform} account.`,
        );
      }

      if (!adAccount.isActive) {
        throw new BadRequestException(
          `Ad account ${adAccountId} is not active.`,
        );
      }
    }
  }

  private requireAdAccountId(
    platform: CampaignGeneratorPlatform,
    dto: GenerateCampaignDto,
  ): string {
    const adAccountId = this.getAdAccountId(platform, dto);

    if (!adAccountId) {
      throw new BadRequestException(
        `adAccountIds.${platform} is required for platform ${platform}.`,
      );
    }

    return adAccountId;
  }

  private getAdAccountId(
    platform: CampaignGeneratorPlatform,
    dto: GenerateCampaignDto,
  ): string | undefined {
    if (platform === PlatformType.META) {
      return dto.adAccountIds.META;
    }

    return dto.adAccountIds.TIKTOK;
  }

  private resolveCreativeType(
    dto: GenerateCampaignDto,
    product: ShopifyProductResponseDto,
  ): CreativeType {
    if (dto.preferences?.creativeType) {
      return dto.preferences.creativeType;
    }

    if (product.images.length > 0 || product.featuredImageUrl) {
      return CreativeType.IMAGE;
    }

    return CreativeType.TEXT;
  }

  private splitBudget(total: number, parts: number): number {
    if (parts <= 0) {
      throw new BadRequestException('Cannot split budget across zero parts.');
    }

    return Math.round((total / parts) * 100) / 100;
  }

  private buildDestinationUrl(
    shopDomain: string | null | undefined,
    handle: string,
  ): string | undefined {
    if (!shopDomain) {
      return undefined;
    }

    const normalizedDomain = shopDomain
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');

    return `https://${normalizedDomain}/products/${handle}`;
  }
}
