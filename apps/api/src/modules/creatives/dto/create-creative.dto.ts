import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  CallToAction,
  CreativeType,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateCreativeDto {
  @ApiProperty({
    example: 'Summer Campaign Creative',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: CreativeType,
  })
  @IsEnum(CreativeType)
  type: CreativeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: CallToAction,
  })
  @IsOptional()
  @IsEnum(CallToAction)
  callToAction?: CallToAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  landingPageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  deepLinkUrl?: string;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];
}