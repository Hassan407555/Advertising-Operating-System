import { ApiProperty } from '@nestjs/swagger';
import { CreativeType, PlatformType } from '@prisma/client';

export class GeneratedCampaignSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: PlatformType,
  })
  platform!: PlatformType;

  @ApiProperty()
  name!: string;
}

export class GeneratedAdSetSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty({
    enum: PlatformType,
  })
  platform!: PlatformType;

  @ApiProperty({
    example: 'US',
  })
  country!: string;

  @ApiProperty()
  name!: string;
}

export class GeneratedAdSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  adSetId!: string;

  @ApiProperty()
  name!: string;
}

export class GeneratedCreativeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: CreativeType,
  })
  type!: CreativeType;

  @ApiProperty()
  name!: string;
}

export class GenerateCampaignResponseDto {
  @ApiProperty({
    type: [GeneratedCampaignSummaryDto],
  })
  campaigns!: GeneratedCampaignSummaryDto[];

  @ApiProperty({
    type: [GeneratedAdSetSummaryDto],
  })
  adSets!: GeneratedAdSetSummaryDto[];

  @ApiProperty({
    type: [GeneratedAdSummaryDto],
  })
  ads!: GeneratedAdSummaryDto[];

  @ApiProperty({
    type: [GeneratedCreativeSummaryDto],
  })
  creatives!: GeneratedCreativeSummaryDto[];
}
