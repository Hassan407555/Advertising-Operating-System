import { Injectable } from '@nestjs/common';

import { PlatformConnectionResponseDto } from '../dto/platform-connection-response.dto';
import { PlatformConnectionWithRelations } from '../constants/platform-connection.constants';

@Injectable()
export class PlatformConnectionMapper {
  toResponse(
    connection: PlatformConnectionWithRelations,
  ): PlatformConnectionResponseDto {
    return {
      id: connection.id,

      organizationId: connection.organizationId,

      createdByUserId: connection.createdByUserId,

      platform: connection.platform,

      accountId: connection.accountId,

      accountName: connection.accountName,

      externalName: connection.externalName,

      status: connection.status,

      syncStatus: connection.syncStatus,

      lastSyncedAt: connection.lastSyncedAt,

      lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt,

      lastFailedSyncAt: connection.lastFailedSyncAt,

      webhookUrl: connection.webhookUrl,

      metadata:
  connection.metadata &&
  typeof connection.metadata === 'object' &&
  !Array.isArray(connection.metadata)
    ? (connection.metadata as Record<string, any>)
    : undefined,

      version: connection.version,

      createdAt: connection.createdAt,

      updatedAt: connection.updatedAt,
    };
  }

  toResponseArray(
    connections: PlatformConnectionWithRelations[],
  ): PlatformConnectionResponseDto[] {
    return connections.map((connection) => this.toResponse(connection));
  }
}