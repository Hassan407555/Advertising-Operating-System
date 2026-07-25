import {
  ApiProperty,
  PartialType,
} from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';

import { CreateCreativeAssetDto } from './create-creative-asset.dto';

export class UpdateCreativeAssetDto extends PartialType(
  CreateCreativeAssetDto,
) {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description:
      'Current entity version used for optimistic locking.',
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version!: number;
}