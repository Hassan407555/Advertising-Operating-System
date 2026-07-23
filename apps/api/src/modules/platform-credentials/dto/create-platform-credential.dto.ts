import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePlatformCredentialDto {
  @ApiProperty({
    description: 'Platform Connection ID',
    example: 'cmf8x9ab00001abcde123456',
  })
  @IsString()
  platformConnectionId: string;

  @ApiProperty({
    description: 'Encrypted access token',
    example: 'EAABxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Encrypted refresh token',
    example: 'refresh_xxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Access token expiration date',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'OAuth scopes',
    example: ['ads_management', 'business_management'],
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  scopes: string[];

  @ApiPropertyOptional({
    description: 'Whether the credential is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Credential revocation date',
  })
  @IsOptional()
  @IsDateString()
  revokedAt?: string;

  @ApiPropertyOptional({
    description: 'Reason for revocation',
    example: 'User disconnected account',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  revokedReason?: string;

  @ApiPropertyOptional({
    description: 'Token rotation date',
  })
  @IsOptional()
  @IsDateString()
  rotatedAt?: string;
}