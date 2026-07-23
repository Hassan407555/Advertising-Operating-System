import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PlatformCredentialsService } from './platform-credentials.service';

import { CreatePlatformCredentialDto } from './dto/create-platform-credential.dto';
import { UpdatePlatformCredentialDto } from './dto/update-platform-credential.dto';
import { PlatformCredentialQueryDto } from './dto/platform-credential-query.dto';
import { PlatformCredentialResponseDto } from './dto/platform-credential-response.dto';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import {
  UseGuards,
} from '@nestjs/common';

@ApiTags('Platform Credentials')
@ApiBearerAuth()
@Controller('platform-credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformCredentialsController {
  constructor(
    private readonly platformCredentialsService: PlatformCredentialsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create platform credential' })
  @ApiResponse({
    status: 201,
    type: PlatformCredentialResponseDto,
  })
  create(
    @Body() dto: CreatePlatformCredentialDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
    return this.platformCredentialsService.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List platform credentials' })
  findAll(
    @Query() query: PlatformCredentialQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<PlatformCredentialResponseDto>
  > {
    return this.platformCredentialsService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get platform credential' })
  @ApiResponse({
    status: 200,
    type: PlatformCredentialResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
    return this.platformCredentialsService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update platform credential' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformCredentialDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
    return this.platformCredentialsService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Revoke platform credential' })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.platformCredentialsService.remove(
      id,
      currentUser,
    );
  }
}