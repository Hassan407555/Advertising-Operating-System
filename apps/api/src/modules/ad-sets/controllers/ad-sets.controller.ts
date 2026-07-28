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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import { AdSetsService } from '../services/ad-sets.service';

import { CreateAdSetDto } from '../dto/create-ad-set.dto';
import { UpdateAdSetDto } from '../dto/update-ad-set.dto';
import { FindAllAdSetsDto } from '../dto/find-all-ad-sets.dto';
import { AdSetResponseDto } from '../dto/ad-set-response.dto';

@ApiTags('Ad Sets')
@ApiBearerAuth()
@Controller('ad-sets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdSetsController {
  constructor(
    private readonly adSetsService: AdSetsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create ad set' })
  async create(
    @Body() createAdSetDto: CreateAdSetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.create(
      createAdSetDto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List ad sets' })
  async findAll(
    @Query() query: FindAllAdSetsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<AdSetResponseDto>
  > {
    return this.adSetsService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get ad set' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update ad set' })
  async update(
    @Param('id') id: string,
    @Body() updateAdSetDto: UpdateAdSetDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    return this.adSetsService.update(
      id,
      updateAdSetDto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete ad set' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.adSetsService.remove(
      id,
      currentUser,
    );
  }
}
