import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CallToAction,
  CreativeType,
  Currency,
  PlatformType,
} from '@prisma/client';

import { MarketingGoal } from '../../campaign-generator/enums/marketing-goal.enum';
import { PublisherPlatform } from '../../publisher/enums/publisher.enums';
import {
  CampaignGeneratorAdAccountIdsDto,
  CampaignGeneratorPreferencesDto,
} from '../../campaign-generator/dto/generate-campaign.dto';

export class RunCampaignWorkflowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  countries!: string[];

  @ApiProperty({ enum: PlatformType, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PlatformType, { each: true })
  platforms!: PlatformType[];

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  dailyBudget!: number;

  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  language!: string;

  @ApiProperty({ enum: MarketingGoal })
  @IsEnum(MarketingGoal)
  marketingGoal!: MarketingGoal;

  @ApiProperty({ type: CampaignGeneratorAdAccountIdsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignGeneratorAdAccountIdsDto)
  adAccountIds!: CampaignGeneratorAdAccountIdsDto;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ type: CampaignGeneratorPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignGeneratorPreferencesDto)
  preferences?: CampaignGeneratorPreferencesDto;
}

export class RunPublishWorkflowDto {
  @ApiPropertyOptional({
    description: 'Single campaign to publish. Prefer campaignIds when multiple.',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignIds?: string[];

  @ApiPropertyOptional({ enum: PublisherPlatform })
  @IsOptional()
  @IsEnum(PublisherPlatform)
  platform?: PublisherPlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adAccountId?: string;

  @ApiPropertyOptional({ type: CampaignGeneratorAdAccountIdsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignGeneratorAdAccountIdsDto)
  adAccountIds?: CampaignGeneratorAdAccountIdsDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class RunSynchronizationWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignIds?: string[];
}

export class RunFullWorkflowDto extends RunCampaignWorkflowDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class RunActionDto {
  @ApiProperty({
    enum: [
      'GENERATE_CAMPAIGN',
      'GENERATE_AI_COPY',
      'PUBLISH_CAMPAIGN',
      'SYNCHRONIZE_CAMPAIGN',
    ],
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
