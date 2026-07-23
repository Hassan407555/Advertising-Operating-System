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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { AdsService } from './ads.service';

import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/query-ads.dto';
import { AdResponseDto } from './dto/ad-response.dto';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
  ) {}

  @Post()
  async create(
    @Body() createAdDto: CreateAdDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.create(createAdDto, currentUser);
  }

  @Get()
  async findAll(
    @Query() query: AdQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AdResponseDto>> {
    return this.adsService.findAll(query, currentUser);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.findOne(id, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdResponseDto> {
    return this.adsService.update(id, updateAdDto, currentUser);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.adsService.remove(id, currentUser);
  }
}