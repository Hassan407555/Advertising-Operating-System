import {
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationActionType } from '@prisma/client';

export class AutomationActionDefinitionDto {
  @ApiProperty({
    enum: AutomationActionType,
    example: AutomationActionType.GENERATE_CAMPAIGN,
  })
  @IsEnum(AutomationActionType)
  type: AutomationActionType;

  @ApiPropertyOptional({
    type: Object,
    example: {
      source: 'shopify-product',
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
