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

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { CampaignsService } from '../services/campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Create campaign',
  })
  @ApiResponse({
    status: 201,
    type: CampaignResponseDto,
  })
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.create(dto, currentUser);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get campaigns',
  })
  findAll(
    @Query() query: CampaignQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<
    PaginatedResponseDto<CampaignResponseDto>
  > {
    return this.campaignsService.findAll(
      query,
      currentUser,
    );
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Get campaign',
  })
  @ApiResponse({
    status: 200,
    type: CampaignResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(
      id,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Update campaign',
  })
  @ApiResponse({
    status: 200,
    type: CampaignResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Delete campaign',
  })
  @ApiResponse({
    status: 204,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.campaignsService.remove(
      id,
      currentUser,
    );
  }
}
