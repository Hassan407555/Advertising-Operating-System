import { Injectable } from '@nestjs/common';

import type { GeneratedMarketingCopy } from '../interfaces/generated-marketing-copy.interface';
import {
  AiCopyExecutionMetadataDto,
  GeneratedCreativeCopyDto,
  GenerateAiCopyResponseDto,
} from '../dto/generate-ai-copy-response.dto';

@Injectable()
export class AiCopyMapper {
  toGeneratedItem(params: {
    creativeId: string;
    productId?: string;
    adIds: string[];
    copy: GeneratedMarketingCopy;
    provider: string;
    model: string;
  }): GeneratedCreativeCopyDto {
    const { copy } = params;

    return {
      creativeId: params.creativeId,
      productId: params.productId,
      adIds: params.adIds,
      headline: copy.headline,
      primaryText: copy.primaryText,
      description: copy.description,
      cta: copy.cta,
      suggestedHook: copy.suggestedHook,
      painPoints: copy.painPoints,
      benefits: copy.benefits,
      targetAudienceSummary: copy.targetAudienceSummary,
      offerAngle: copy.offerAngle,
      marketingAngle: copy.marketingAngle,
      platformNotes: copy.platformNotes,
      tone: copy.tone,
      provider: params.provider,
      model: params.model,
    };
  }

  toResponse(params: {
    campaignId: string;
    creativesProcessed: number;
    adsProcessed: number;
    execution: AiCopyExecutionMetadataDto;
    generated: GeneratedCreativeCopyDto[];
  }): GenerateAiCopyResponseDto {
    return {
      success: true,
      campaignId: params.campaignId,
      creativesProcessed: params.creativesProcessed,
      adsProcessed: params.adsProcessed,
      execution: params.execution,
      generated: params.generated,
    };
  }
}
