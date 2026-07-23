import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { CreatePlatformCredentialDto } from './create-platform-credential.dto';

export class UpdatePlatformCredentialDto extends PartialType(
  CreatePlatformCredentialDto,
) {
  @ApiPropertyOptional({
    description: 'Required for optimistic locking',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: 'Encrypted access token',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Encrypted refresh token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Access token expiration date',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'OAuth scopes',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Whether the credential is active',
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