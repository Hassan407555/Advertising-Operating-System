import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformCredentialResponseDto {
  @ApiProperty({
    example: 'cmf8x9ab00001abcde123456',
  })
  id: string;

  @ApiProperty({
    example: 'cmf8x123400001abcdef1234',
  })
  platformConnectionId: string;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
  })
  expiresAt?: Date | null;

  @ApiProperty({
    example: ['ads_management', 'business_management'],
    type: [String],
  })
  scopes: string[];

  @ApiProperty({
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    example: '2026-08-15T10:30:00.000Z',
  })
  revokedAt?: Date | null;

  @ApiPropertyOptional({
    example: 'User disconnected account',
  })
  revokedReason?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-10T09:15:00.000Z',
  })
  rotatedAt?: Date | null;

  @ApiProperty({
    example: 1,
  })
  version: number;

  @ApiProperty({
    example: '2026-07-24T08:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-24T08:00:00.000Z',
  })
  updatedAt: Date;
}