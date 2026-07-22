import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { CampaignsService } from '../services/campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignQueryDto } from '../dto/campaign-query.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.campaignsService.create(dto, currentUser);
  }

  @Get()
  findAll(
    @Query() query: CampaignQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.campaignsService.findAll(query, currentUser);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.campaignsService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.campaignsService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.campaignsService.remove(id, currentUser);
  }
}