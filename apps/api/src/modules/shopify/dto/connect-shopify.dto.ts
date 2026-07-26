import {
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ConnectShopifyDto {
  @ApiProperty({
    example: 'my-store.myshopify.com',
    description: 'Shopify store domain',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/, {
    message:
      'Shop domain must be a valid myshopify.com domain.',
  })
  shopDomain!: string;
}