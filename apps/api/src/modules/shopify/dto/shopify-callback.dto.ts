import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ShopifyCallbackDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop!: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  hmac?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}