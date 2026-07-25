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

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { CampaignsService } from '../services/campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
  ) {}

  @Post()
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