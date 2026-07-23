import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AdAccountResponseDto } from '../dto/ad-account-response.dto';

@Injectable()
export class AdAccountMapper {
  toResponse(
    account: Prisma.AdAccountGetPayload<Record<string, never>>,
  ): AdAccountResponseDto {
    return {
      id: account.id,
      organizationId: account.organizationId,
      platformConnectionId: account.platformConnectionId,
      platform: account.platform,
      externalId: account.externalId,
      externalName: account.externalName,
      externalStatus: account.externalStatus,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      currency: account.currency,
      timezone: account.timezone,
      status: account.status,
      isActive: account.isActive,
      spend: account.spend ? Number(account.spend) : null,
      impressions: account.impressions,
      clicks: account.clicks,
      conversions: account.conversions
        ? Number(account.conversions)
        : null,
      lastSyncedAt: account.lastSyncedAt,
      lastSuccessfulSyncAt: account.lastSuccessfulSyncAt,
      lastFailedSyncAt: account.lastFailedSyncAt,
      metadata: account.metadata as Record<string, any> | null,
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  toResponseList(
    accounts: Prisma.AdAccountGetPayload<Record<string, never>>[],
  ): AdAccountResponseDto[] {
    return accounts.map((account) => this.toResponse(account));
  }
}