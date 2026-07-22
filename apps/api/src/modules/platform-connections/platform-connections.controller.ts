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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { PlatformConnectionsService } from './platform-connections.service';
import { CreatePlatformConnectionDto } from './dto/create-platform-connection.dto';
import { UpdatePlatformConnectionDto } from './dto/update-platform-connection.dto';
import { PlatformConnectionQueryDto } from './dto/platform-connection-query.dto';
import { PlatformConnectionResponseDto } from './dto/platform-connection-response.dto';

@ApiTags('Platform Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platform-connections')
export class PlatformConnectionsController {
  constructor(
    private readonly platformConnectionsService: PlatformConnectionsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create platform connection',
  })
  @ApiResponse({
    status: 201,
    type: PlatformConnectionResponseDto,
  })
  create(
    @Body() dto: CreatePlatformConnectionDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformConnectionResponseDto> {
    return this.platformConnectionsService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'List platform connections',
  })
  findAll(
    @Query() query: PlatformConnectionQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<PlatformConnectionResponseDto>> {
    return this.platformConnectionsService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get platform connection',
  })
  @ApiResponse({
    status: 200,
    type: PlatformConnectionResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformConnectionResponseDto> {
    return this.platformConnectionsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update platform connection',
  })
  @ApiResponse({
    status: 200,
    type: PlatformConnectionResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformConnectionDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformConnectionResponseDto> {
    return this.platformConnectionsService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete platform connection',
  })
  @ApiResponse({
    status: 204,
    description: 'Platform connection deleted successfully',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.platformConnectionsService.remove(id, currentUser);
  }
}