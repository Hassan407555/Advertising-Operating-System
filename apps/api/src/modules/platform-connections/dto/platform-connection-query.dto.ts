import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ConnectionStatus,
  PlatformType,
  SyncStatus,
} from '@prisma/client';

export class PlatformConnectionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @IsOptional()
  @IsEnum(ConnectionStatus)
  status?: ConnectionStatus;

  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @IsOptional()
  @IsIn([
    'accountName',
    'platform',
    'status',
    'syncStatus',
    'createdAt',
    'updatedAt',
    'lastSyncedAt',
  ])
  sortBy = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}