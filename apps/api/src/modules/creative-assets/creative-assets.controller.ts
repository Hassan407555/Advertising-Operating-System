import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { CreativeAssetsService } from './creative-assets.service';
import { AssetUploadService } from './services/asset-upload.service';

import { CreateCreativeAssetDto } from './dto/create-creative-asset.dto';
import { UpdateCreativeAssetDto } from './dto/update-creative-asset.dto';
import { QueryCreativeAssetsDto } from './dto/query-creative-assets.dto';
import { CreativeAssetResponseDto } from './dto/creative-asset-response.dto';
import { UploadAssetDto } from './dto/upload-asset.dto';

@ApiTags('Creative Assets')
@ApiBearerAuth()
@Controller('creative-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreativeAssetsController {
  constructor(
    private readonly service: CreativeAssetsService,
    private readonly assetUploadService: AssetUploadService,
  ) {}

@Post('upload')
@Roles('OWNER', 'ADMIN')
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiOperation({
  summary: 'Upload a creative asset',
})
@ApiBody({
  schema: {
    type: 'object',
    required: ['file', 'assetType'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
      assetType: {
        type: 'string',
      },
      creativeId: {
        type: 'string',
      },
      adId: {
        type: 'string',
      },
      isPrimary: {
        type: 'boolean',
      },
      displayOrder: {
        type: 'integer',
      },
    },
  },
})
@ApiCreatedResponse({
  type: CreativeAssetResponseDto,
})
@ApiBadRequestResponse({
  description: 'Invalid upload request.',
})
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
uploadAsset(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadAssetDto,
  @CurrentUser() currentUser: JwtPayload,
): Promise<CreativeAssetResponseDto> {
  return this.assetUploadService.upload(
    file,
    dto,
    currentUser,
  );
}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Create creative asset',
  })
  @ApiCreatedResponse({
    type: CreativeAssetResponseDto,
  })
  create(
    @Body() dto: CreateCreativeAssetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'List creative assets',
  })
  @ApiOkResponse({
    description: 'Paginated list of creative assets.',
  })
  findAll(
    @Query() query: QueryCreativeAssetsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<CreativeAssetResponseDto>
  > {
    return this.service.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get creative asset',
  })
  @ApiOkResponse({
    type: CreativeAssetResponseDto,
  })
  @ApiNotFoundResponse()
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Update creative asset',
  })
  @ApiOkResponse({
    type: CreativeAssetResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreativeAssetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.update(
      id,
      dto,
      currentUser,
    );
  }

  @Patch(':id/archive')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Archive creative asset',
  })
  @ApiOkResponse({
    type: CreativeAssetResponseDto,
  })
  archive(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.archive(
      id,
      currentUser,
    );
  }

  @Patch(':id/restore')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Restore creative asset',
  })
  @ApiOkResponse({
    type: CreativeAssetResponseDto,
  })
  restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.restore(
      id,
      currentUser,
    );
  }

  @Patch(':id/set-primary')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Set primary creative asset',
  })
  @ApiOkResponse({
    type: CreativeAssetResponseDto,
  })
  setPrimary(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.setPrimary(
      id,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Delete creative asset',
  })
  @ApiNoContentResponse()
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.service.remove(
      id,
      currentUser,
    );
  }
}