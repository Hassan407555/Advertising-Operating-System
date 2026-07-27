import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationTriggerType } from '@prisma/client';

import { AutomationActionDefinitionDto } from './automation-action-definition.dto';

export class CreateAutomationPipelineDto {
  @ApiProperty({
    example: 'Launch campaign for new Shopify products',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example:
      'Generates campaign assets when a product is ready to advertise.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: AutomationTriggerType,
    example: AutomationTriggerType.MANUAL_LAUNCH,
  })
  @IsEnum(AutomationTriggerType)
  triggerType: AutomationTriggerType;

  @ApiPropertyOptional({
    type: Object,
    example: {
      productStatus: 'ACTIVE',
    },
  })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @ApiProperty({
    type: [AutomationActionDefinitionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDefinitionDto)
  actions: AutomationActionDefinitionDto[];

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
