import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';

import {
  CreativeAssetType,
  MembershipRole,
} from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { StorageAssetsService } from '../services/storage-assets.service';

import { UploadFileDto } from '../dto/upload-file.dto';
import { UploadMultipleFilesDto } from '../dto/upload-multiple-files.dto';
import { StorageResponseDto } from '../dto/storage-response.dto';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(
    private readonly storageAssetsService: StorageAssetsService,
  ) {}

  @Post('upload')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Upload a file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        directory: {
          type: 'string',
        },
        creativeId: {
          type: 'string',
        },
        adId: {
          type: 'string',
        },
        assetType: {
          type: 'string',
          enum: Object.values(CreativeAssetType),
        },
        isPrimary: {
          type: 'boolean',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    type: StorageResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,

    @Body()
    dto: UploadFileDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto> {
    return this.storageAssetsService.upload(
      file,
      dto,
      currentUser,
    );
  }

  @Post('upload/multiple')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Upload multiple files',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        directory: {
          type: 'string',
        },
        creativeId: {
          type: 'string',
        },
        adId: {
          type: 'string',
        },
        assetType: {
          type: 'string',
          enum: Object.values(CreativeAssetType),
        },
        isPrimary: {
          type: 'boolean',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    type: StorageResponseDto,
    isArray: true,
  })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultiple(
    @UploadedFiles()
    files: Express.Multer.File[],

    @Body()
    dto: UploadMultipleFilesDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto[]> {
    return this.storageAssetsService.uploadMultiple(
      files,
      dto,
      currentUser,
    );
  }

  @Get(':id')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({
    summary: 'Get storage asset',
  })
  @ApiResponse({
    status: 200,
    type: StorageResponseDto,
  })
  async findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto> {
    return this.storageAssetsService.findOne(
      id,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Delete storage asset',
  })
  @ApiResponse({
    status: 204,
  })
  async remove(
    @Param('id')
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ): Promise<void> {
    return this.storageAssetsService.remove(
      id,
      currentUser,
    );
  }
}