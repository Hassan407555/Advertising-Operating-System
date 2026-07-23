import { Injectable } from '@nestjs/common';
import { PlatformCredential } from '@prisma/client';

import { PlatformCredentialResponseDto } from '../dto/platform-credential-response.dto';

@Injectable()
export class PlatformCredentialMapper {
  toResponse(
    credential: PlatformCredential,
  ): PlatformCredentialResponseDto {
    return {
      id: credential.id,
      platformConnectionId: credential.platformConnectionId,

      expiresAt: credential.expiresAt,

      scopes: credential.scopes,

      isActive: credential.isActive,

      revokedAt: credential.revokedAt,
      revokedReason: credential.revokedReason,

      rotatedAt: credential.rotatedAt,

      version: credential.version,

      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  toResponseList(
    credentials: PlatformCredential[],
  ): PlatformCredentialResponseDto[] {
    return credentials.map((credential) =>
      this.toResponse(credential),
    );
  }
}