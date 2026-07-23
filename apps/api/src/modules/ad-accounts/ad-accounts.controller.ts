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

import { AdAccountsService } from './ad-accounts.service';

import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { UpdateAdAccountDto } from './dto/update-ad-account.dto';
import { AdAccountQueryDto } from './dto/ad-account-query.dto';
import { AdAccountResponseDto } from './dto/ad-account-response.dto';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Ad Accounts')
@ApiBearerAuth()
@Controller('ad-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdAccountsController {
  constructor(
    private readonly adAccountsService: AdAccountsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create ad account' })
  @ApiResponse({
    status: 201,
    type: AdAccountResponseDto,
  })
  create(
    @Body() dto: CreateAdAccountDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    return this.adAccountsService.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List ad accounts' })
  findAll(
    @Query() query: AdAccountQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<AdAccountResponseDto>
  > {
    return this.adAccountsService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get ad account' })
  @ApiResponse({
    status: 200,
    type: AdAccountResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    return this.adAccountsService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update ad account' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdAccountDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    return this.adAccountsService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete ad account' })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.adAccountsService.remove(
      id,
      currentUser,
    );
  }
}