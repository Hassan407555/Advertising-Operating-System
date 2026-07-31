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

export class MetaGraphErrorDetailsDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  httpStatus!: number;

  @ApiPropertyOptional()
  code?: number;

  @ApiPropertyOptional()
  errorSubcode?: number;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  fbtraceId?: string;

  @ApiPropertyOptional()
  path?: string;

  @ApiPropertyOptional()
  raw?: unknown;
}

export class PublishStageLogDto {
  @ApiProperty({
    enum: [
      'campaign',
      'ad_set',
      'creative',
      'image_upload',
      'video_upload',
      'ad',
      'publish_complete',
    ],
  })
  stage!: string;

  @ApiProperty({
    enum: ['started', 'succeeded', 'failed', 'skipped'],
  })
  status!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional()
  durationMs?: number;

  @ApiPropertyOptional({
    enum: PublishEntityType,
  })
  entityType?: PublishEntityType;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional({
    type: MetaGraphErrorDetailsDto,
  })
  metaError?: MetaGraphErrorDetailsDto;
}

export class PublishDiagnosticsDto {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional({
    enum: [
      'campaign',
      'ad_set',
      'creative',
      'image_upload',
      'video_upload',
      'ad',
      'publish_complete',
    ],
  })
  stage?: string;

  @ApiPropertyOptional()
  errorCode?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  metaTraceId?: string;

  @ApiPropertyOptional()
  httpStatus?: number;

  @ApiPropertyOptional()
  graphErrorCode?: number;

  @ApiPropertyOptional()
  graphErrorSubcode?: number;

  @ApiPropertyOptional()
  retryable?: boolean;

  @ApiProperty({
    type: [PublishStageLogDto],
  })
  stages!: PublishStageLogDto[];
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

  @ApiPropertyOptional({
    type: PublishDiagnosticsDto,
  })
  diagnostics?: PublishDiagnosticsDto;
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
