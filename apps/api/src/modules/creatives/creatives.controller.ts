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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { CreativesService } from './creatives.service';

import { CreateCreativeDto } from './dto/create-creative.dto';
import { UpdateCreativeDto } from './dto/update-creative.dto';
import { CreativeQueryDto } from './dto/creative-query.dto';
import { CreativeResponseDto } from './dto/creative-response.dto';

@ApiTags('Creatives')
@ApiBearerAuth()
@Controller('creatives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreativesController {
  constructor(
    private readonly creativesService: CreativesService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create creative' })
  @ApiResponse({
    status: 201,
    type: CreativeResponseDto,
  })
  create(
    @Body() dto: CreateCreativeDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    return this.creativesService.create(dto, currentUser);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List creatives' })
  findAll(
    @Query() query: CreativeQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<CreativeResponseDto>> {
    return this.creativesService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get creative' })
  @ApiResponse({
    status: 200,
    type: CreativeResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    return this.creativesService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update creative' })
  @ApiResponse({
    status: 200,
    type: CreativeResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreativeDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    return this.creativesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete creative' })
  @ApiResponse({
    status: 204,
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.creativesService.remove(id, currentUser);
  }

  @Patch(':id/archive')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Archive creative' })
  @ApiResponse({
    status: 200,
    type: CreativeResponseDto,
  })
  archive(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    return this.creativesService.archive(id, currentUser);
  }

  @Patch(':id/restore')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Restore creative' })
  @ApiResponse({
    status: 200,
    type: CreativeResponseDto,
  })
  restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    return this.creativesService.restore(id, currentUser);
  }
}