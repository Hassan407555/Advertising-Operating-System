import {
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  CallToAction,
  CreativeType,
} from '@prisma/client';
import {
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsIn,
} from 'class-validator';

export class CreativeQueryDto {
  @ApiPropertyOptional({
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CreativeType,
  })
  @IsOptional()
  @IsEnum(CreativeType)
  type?: CreativeType;

  @ApiPropertyOptional({
    enum: CallToAction,
  })
  @IsOptional()
  @IsEnum(CallToAction)
  callToAction?: CallToAction;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Only archived creatives',
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: [
      'name',
      'type',
      'createdAt',
      'updatedAt',
      'externalName',
      'headline',
    ],
  })
  @IsOptional()
  @IsIn([
    'name',
    'type',
    'createdAt',
    'updatedAt',
    'externalName',
    'headline',
  ])
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}