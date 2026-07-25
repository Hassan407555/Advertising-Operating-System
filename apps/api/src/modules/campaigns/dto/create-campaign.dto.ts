import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CampaignBuyingType,
  CampaignObjective,
  Currency,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({
    example: 'cm123abc456def789',
    description: 'Ad account ID.',
  })
  @IsString()
  @IsNotEmpty()
  adAccountId: string;

  @ApiProperty({
    example: 'Summer Sale Campaign',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'summer-sale-2026',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({
    enum: CampaignObjective,
  })
  @IsEnum(CampaignObjective)
  objective: CampaignObjective;

  @ApiPropertyOptional({
    enum: CampaignBuyingType,
    default: CampaignBuyingType.AUCTION,
  })
  @IsOptional()
  @IsEnum(CampaignBuyingType)
  buyingType?: CampaignBuyingType = CampaignBuyingType.AUCTION;

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyBudget?: number;

  @ApiPropertyOptional({
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lifetimeBudget?: number;

  @ApiPropertyOptional({
    enum: Currency,
    default: Currency.USD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.USD;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-08-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}