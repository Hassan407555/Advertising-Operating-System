import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  SyncChangeType,
  SyncEntityType,
  SyncStatus,
  SynchronizationPlatform,
} from '../enums/synchronization.enums';

export class SyncEntityResultDto {
  @ApiProperty({ enum: SyncEntityType })
  entityType!: SyncEntityType;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  externalId?: string | null;

  @ApiProperty({ enum: SyncChangeType })
  changeType!: SyncChangeType;

  @ApiProperty({ type: [String] })
  fieldsUpdated!: string[];

  @ApiPropertyOptional()
  message?: string;
}

export class SyncIssueDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ enum: SyncEntityType })
  entityType?: SyncEntityType;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiPropertyOptional()
  field?: string;
}

export class SyncResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ enum: SynchronizationPlatform })
  platform!: SynchronizationPlatform;

  @ApiProperty({ enum: SyncStatus })
  status!: SyncStatus;

  @ApiProperty({ enum: SyncEntityType })
  scope!: SyncEntityType;

  @ApiProperty()
  scopeId!: string;

  @ApiProperty({ type: [SyncEntityResultDto] })
  entities!: SyncEntityResultDto[];

  @ApiProperty({ type: [SyncIssueDto] })
  issues!: SyncIssueDto[];

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  completedAt!: string;

  @ApiProperty()
  durationMs!: number;
}

export class SyncEntityStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  externalId!: string;

  @ApiPropertyOptional()
  externalStatus?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  spend?: number | null;

  @ApiPropertyOptional()
  impressions?: number | null;

  @ApiPropertyOptional()
  clicks?: number | null;

  @ApiPropertyOptional()
  conversions?: number | null;

  @ApiPropertyOptional()
  lastSyncedAt?: string | null;

  @ApiPropertyOptional()
  lastSuccessfulSyncAt?: string | null;

  @ApiPropertyOptional()
  lastFailedSyncAt?: string | null;
}

export class SyncAdSetStatusDto extends SyncEntityStatusDto {
  @ApiProperty({ type: [SyncEntityStatusDto] })
  ads!: SyncEntityStatusDto[];
}

export class CampaignSyncStatusDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: SynchronizationPlatform })
  platform!: SynchronizationPlatform;

  @ApiProperty()
  externalId!: string;

  @ApiPropertyOptional()
  externalStatus?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  spend?: number | null;

  @ApiPropertyOptional()
  impressions?: number | null;

  @ApiPropertyOptional()
  clicks?: number | null;

  @ApiPropertyOptional()
  conversions?: number | null;

  @ApiPropertyOptional()
  lastSyncedAt?: string | null;

  @ApiPropertyOptional()
  lastSuccessfulSyncAt?: string | null;

  @ApiPropertyOptional()
  lastFailedSyncAt?: string | null;

  @ApiProperty({ type: [SyncAdSetStatusDto] })
  adSets!: SyncAdSetStatusDto[];
}
