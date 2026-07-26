import { ApiProperty } from '@nestjs/swagger';

export class ShopifyProductVariantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  title!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  sku!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  barcode!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  price!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  compareAtPrice!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  inventoryQuantity!: number | null;
}

export class ShopifyProductImageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  alt!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  width!: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  height!: number | null;

  @ApiProperty()
  displayOrder!: number;
}

export class ShopifyProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  handle!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  vendor!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  productType!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  description!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({
    type: [String],
  })
  tags!: string[];

  @ApiProperty({
    required: false,
    nullable: true,
  })
  featuredImageUrl!: string | null;

  @ApiProperty({
    type: [ShopifyProductVariantResponseDto],
  })
  variants!: ShopifyProductVariantResponseDto[];

  @ApiProperty({
    type: [ShopifyProductImageResponseDto],
  })
  images!: ShopifyProductImageResponseDto[];

  @ApiProperty({
    required: false,
    nullable: true,
  })
  lastSyncedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}