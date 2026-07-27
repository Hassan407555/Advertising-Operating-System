import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CreateAutomationPipelineDto } from './create-automation-pipeline.dto';

export class UpdateAutomationPipelineDto extends PartialType(
  CreateAutomationPipelineDto,
) {
  @ApiPropertyOptional({
    example: 1,
    description: 'Current pipeline version for optimistic locking.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
