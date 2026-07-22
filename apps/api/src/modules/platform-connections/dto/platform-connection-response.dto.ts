import {
  ConnectionStatus,
  PlatformType,
  SyncStatus,
} from '@prisma/client';

export class PlatformConnectionResponseDto {
  id: string;

  organizationId: string;

  createdByUserId: string;

  platform: PlatformType;

  accountId: string;

  accountName: string;

  externalName?: string | null;

  status: ConnectionStatus;

  syncStatus: SyncStatus;

  lastSyncedAt?: Date | null;

  lastSuccessfulSyncAt?: Date | null;

  lastFailedSyncAt?: Date | null;

  webhookUrl?: string | null;

  metadata?: Record<string, any> | null;

  version: number;

  createdAt: Date;

  updatedAt: Date;
}