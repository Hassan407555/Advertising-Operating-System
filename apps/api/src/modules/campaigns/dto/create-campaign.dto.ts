import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CampaignObjective,
  CampaignBuyingType,
  Currency,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  adAccountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsEnum(CampaignObjective)
  objective: CampaignObjective;

  @IsOptional()
  @IsEnum(CampaignBuyingType)
  buyingType?: CampaignBuyingType = CampaignBuyingType.AUCTION;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lifetimeBudget?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.USD;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}