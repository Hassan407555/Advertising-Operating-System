import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  PublishEntityType,
  PublishStatus,
  PublisherPlatform,
} from '../enums/publisher.enums';

export class PublishValidationIssueDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({
    enum: PublishEntityType,
  })
  entityType?: PublishEntityType;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiPropertyOptional()
  field?: string;
}

export class PublishValidationResponseDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({
    enum: PublisherPlatform,
  })
  platform!: PublisherPlatform;

  @ApiProperty({
    type: [PublishValidationIssueDto],
  })
  issues!: PublishValidationIssueDto[];
}

export class PublishEntityResultDto {
  @ApiProperty({
    enum: PublishEntityType,
  })
  entityType!: PublishEntityType;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty({
    enum: PublishStatus,
  })
  status!: PublishStatus;

  @ApiPropertyOptional()
  message?: string;
}

export class PublishCampaignResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({
    enum: PublisherPlatform,
  })
  platform!: PublisherPlatform;

  @ApiProperty({
    enum: PublishStatus,
  })
  status!: PublishStatus;

  @ApiProperty()
  campaignId!: string;

  @ApiPropertyOptional()
  externalCampaignId?: string;

  @ApiProperty({
    type: [PublishEntityResultDto],
  })
  entities!: PublishEntityResultDto[];

  @ApiProperty({
    type: [PublishValidationIssueDto],
  })
  issues!: PublishValidationIssueDto[];

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  completedAt!: string;

  @ApiProperty()
  durationMs!: number;
}

export class PublisherPlatformsResponseDto {
  @ApiProperty({
    enum: PublisherPlatform,
    isArray: true,
  })
  registered!: PublisherPlatform[];

  @ApiProperty({
    enum: PublisherPlatform,
    isArray: true,
  })
  roadmap!: PublisherPlatform[];
}
