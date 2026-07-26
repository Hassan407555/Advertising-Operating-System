import { ApiProperty } from '@nestjs/swagger';

export class ShopifyStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  platformConnectionId!: string;

  @ApiProperty()
  shopId!: string;

  @ApiProperty()
  shopName!: string;

  @ApiProperty()
  shopDomain!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  currency!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  timezone!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  connectedAt!: Date;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  lastSyncedAt!: Date | null;
}