import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

import { CreateCreativeAssetDto } from './create-creative-asset.dto';

export class UpdateCreativeAssetDto extends PartialType(
  CreateCreativeAssetDto,
) {
  @ApiProperty({
    example: 1,
    description: 'Version used for optimistic locking',
  })
  @IsInt()
  version: number;
}