import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

import { CreateAdSetDto } from './create-ad-set.dto';

export class UpdateAdSetDto extends PartialType(
  OmitType(CreateAdSetDto, ['campaignId'] as const),
) {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;
}
