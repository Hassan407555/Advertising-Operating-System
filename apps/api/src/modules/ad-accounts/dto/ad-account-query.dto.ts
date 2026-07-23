import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  AdAccountStatus,
  Currency,
  PlatformType,
} from '@prisma/client';

export class AdAccountQueryDto {
  @ApiPropertyOptional({
    description: 'Search by account name, external ID, account number or external name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Platform Connection ID',
  })
  @IsOptional()
  @IsString()
  platformConnectionId?: string;

  @ApiPropertyOptional({
    enum: PlatformType,
  })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiPropertyOptional({
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    enum: AdAccountStatus,
  })
  @IsOptional()
  @IsEnum(AdAccountStatus)
  status?: AdAccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    enum: [
      'accountName',
      'externalId',
      'currency',
      'status',
      'createdAt',
      'updatedAt',
      'lastSyncedAt',
      'spend',
      'impressions',
      'clicks',
      'conversions',
      'version',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([
    'accountName',
    'externalId',
    'currency',
    'status',
    'createdAt',
    'updatedAt',
    'lastSyncedAt',
    'spend',
    'impressions',
    'clicks',
    'conversions',
    'version',
  ])
  sortBy = 'createdAt';

 @ApiPropertyOptional({
  enum: ['asc', 'desc'],
  default: 'desc',
})
@IsOptional()
@IsIn(['asc', 'desc'])
sortOrder: 'asc' | 'desc' = 'desc';
}