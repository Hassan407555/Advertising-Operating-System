import { PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

import { CreateAdAccountDto } from './create-ad-account.dto';

export class UpdateAdAccountDto extends PartialType(
  CreateAdAccountDto,
) {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}