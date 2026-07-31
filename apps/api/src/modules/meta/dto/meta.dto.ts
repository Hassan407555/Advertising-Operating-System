import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectMetaDto {
  @ApiPropertyOptional({
    description:
      'Optional Shopify store (platform connection) id used for post-OAuth redirect context.',
  })
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class MetaCallbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ name: 'error_reason' })
  @IsOptional()
  @IsString()
  error_reason?: string;

  @ApiPropertyOptional({ name: 'error_description' })
  @IsOptional()
  @IsString()
  error_description?: string;
}

export class MetaAdAccountsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter ad accounts by Meta Business Manager id.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessId?: string;
}

export class MetaInstagramAccountsQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional Facebook Page id used to resolve linked Instagram accounts.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pageId?: string;
}

export class MetaPixelsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter pixels by Meta Business Manager id.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessId?: string;

  @ApiPropertyOptional({
    description: 'Filter pixels by Meta ad account id (act_… or numeric).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  adAccountId?: string;
}

export class MetaCatalogsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter catalogs by Meta Business Manager id.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessId?: string;
}
