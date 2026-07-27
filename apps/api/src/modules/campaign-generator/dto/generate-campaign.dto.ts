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

import { MarketingGoal } from '../enums/marketing-goal.enum';

export class CampaignGeneratorAdAccountIdsDto {
  @ApiPropertyOptional({
    description: 'Ad account ID for Meta.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  META?: string;

  @ApiPropertyOptional({
    description: 'Ad account ID for TikTok.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  TIKTOK?: string;
}

export class CampaignGeneratorPreferencesDto {
  @ApiPropertyOptional({
    example: 'Summer Launch',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  campaignNamePrefix?: string;

  @ApiPropertyOptional({
    enum: CallToAction,
  })
  @IsOptional()
  @IsEnum(CallToAction)
  callToAction?: CallToAction;

  @ApiPropertyOptional({
    enum: CreativeType,
  })
  @IsOptional()
  @IsEnum(CreativeType)
  creativeType?: CreativeType;
}

export class GenerateCampaignDto {
  @ApiProperty({
    example: 'clxproduct123',
    description: 'Synced Shopify product ID.',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    example: ['US', 'CA'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  countries!: string[];

  @ApiProperty({
    enum: PlatformType,
    isArray: true,
    example: [PlatformType.META, PlatformType.TIKTOK],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PlatformType, { each: true })
  platforms!: PlatformType[];

  @ApiProperty({
    example: 50,
    minimum: 1,
    description: 'Total daily budget, split evenly across platforms.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  dailyBudget!: number;

  @ApiProperty({
    example: 'en',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  language!: string;

  @ApiProperty({
    enum: MarketingGoal,
  })
  @IsEnum(MarketingGoal)
  marketingGoal!: MarketingGoal;

  @ApiProperty({
    type: CampaignGeneratorAdAccountIdsDto,
    description:
      'Ad account ID for each selected platform (META and/or TIKTOK).',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignGeneratorAdAccountIdsDto)
  adAccountIds!: CampaignGeneratorAdAccountIdsDto;

  @ApiPropertyOptional({
    enum: Currency,
    default: Currency.USD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    type: CampaignGeneratorPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignGeneratorPreferencesDto)
  preferences?: CampaignGeneratorPreferencesDto;
}
