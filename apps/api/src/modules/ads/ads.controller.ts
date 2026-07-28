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
  ApiTags,
} from '@nestjs/swagger';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { AdsService } from './ads.service';

import { CreateAdDto } from './dto/create-ad.dto';
import { AdQueryDto } from './dto/query-ads.dto';
import { AdResponseDto } from './dto/ad-response.dto';
import { UpdateAdDto } from './dto/update-ad.dto';

@ApiTags('Ads')
@ApiBearerAuth()
@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create ad' })
  async create(
    @Body() createAdDto: CreateAdDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.create(
      createAdDto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List ads' })
  async findAll(
    @Query() query: AdQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<AdResponseDto>
  > {
    return this.adsService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get ad' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update ad' })
  async update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.update(
      id,
      updateAdDto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete ad' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.adsService.remove(
      id,
      currentUser,
    );
  }
}
