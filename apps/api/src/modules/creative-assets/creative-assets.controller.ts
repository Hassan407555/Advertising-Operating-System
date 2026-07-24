import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { CreativeAssetsService } from './creative-assets.service';
import { CreateCreativeAssetDto } from './dto/create-creative-asset.dto';
import { CreativeAssetResponseDto } from './dto/creative-asset-response.dto';
import { QueryCreativeAssetsDto } from './dto/query-creative-assets.dto';
import { UpdateCreativeAssetDto } from './dto/update-creative-asset.dto';

@ApiTags('Creative Assets')
@ApiBearerAuth()
@Controller('creative-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreativeAssetsController {
  constructor(
    private readonly service: CreativeAssetsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create creative asset' })
  @ApiResponse({
    status: 201,
    type: CreativeAssetResponseDto,
  })
  create(
    @Body() dto: CreateCreativeAssetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.create(dto, currentUser);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List creative assets' })
  findAll(
    @Query() query: QueryCreativeAssetsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<CreativeAssetResponseDto>> {
    return this.service.findAll(query, currentUser) as any;
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get creative asset' })
  @ApiResponse({
    status: 200,
    type: CreativeAssetResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.findOne(id, currentUser) as any;
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update creative asset' })
  @ApiResponse({
    status: 200,
    type: CreativeAssetResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreativeAssetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.update(id, dto, currentUser) as any;
  }

  @Patch(':id/archive')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Archive creative asset' })
  @ApiResponse({
    status: 200,
    type: CreativeAssetResponseDto,
  })
  archive(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.archive(id, currentUser) as any;
  }

  @Patch(':id/restore')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Restore creative asset' })
  @ApiResponse({
    status: 200,
    type: CreativeAssetResponseDto,
  })
  restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.restore(id, currentUser) as any;
  }

  @Patch(':id/set-primary')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Set primary creative asset' })
  @ApiResponse({
    status: 200,
    type: CreativeAssetResponseDto,
  })
  setPrimary(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    return this.service.setPrimary(id, currentUser) as any;
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete creative asset' })
  @ApiResponse({
    status: 204,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.service.remove(id, currentUser);
  }
}