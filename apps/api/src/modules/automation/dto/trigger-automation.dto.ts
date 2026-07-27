import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerAutomationDto {
  @ApiPropertyOptional({
    type: Object,
    example: {
      productId: 'cmproduct123',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
