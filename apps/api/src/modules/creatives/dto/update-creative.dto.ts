import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

import { CreateCreativeDto } from './create-creative.dto';

export class UpdateCreativeDto extends PartialType(
  CreateCreativeDto,
) {
  @ApiPropertyOptional({
    description: 'Optimistic locking version',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}