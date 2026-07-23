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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import { AdSetsService } from '../services/ad-sets.service';

import { CreateAdSetDto } from '../dto/create-ad-set.dto';
import { UpdateAdSetDto } from '../dto/update-ad-set.dto';
import { FindAllAdSetsDto } from '../dto/find-all-ad-sets.dto';
import { AdSetResponseDto } from '../dto/ad-set-response.dto';

@Controller('ad-sets')
@UseGuards(JwtAuthGuard)
export class AdSetsController {
  constructor(private readonly adSetsService: AdSetsService) {}

  @Post()
  async create(
    @Body() createAdSetDto: CreateAdSetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.create(createAdSetDto, currentUser);
  }

  @Get()
  async findAll(
    @Query() query: FindAllAdSetsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AdSetResponseDto>> {
    return this.adSetsService.findAll(query, currentUser);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.findOne(id, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAdSetDto: UpdateAdSetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.update(id, updateAdSetDto, currentUser);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.adSetsService.remove(id, currentUser);
  }
}