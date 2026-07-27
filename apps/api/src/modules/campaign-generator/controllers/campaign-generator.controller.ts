import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { MembershipRole } from '@prisma/client';

import { GenerateCampaignDto } from '../dto/generate-campaign.dto';
import { GenerateCampaignResponseDto } from '../dto/generate-campaign-response.dto';
import { CampaignGeneratorService } from '../services/campaign-generator.service';

@ApiTags('Campaign Generator')
@ApiBearerAuth()
@Controller('campaign-generator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignGeneratorController {
  constructor(
    private readonly campaignGeneratorService: CampaignGeneratorService,
  ) {}

  @Post('generate')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
  )
  @ApiOperation({
    summary:
      'Generate DRAFT campaigns, ad sets, ads, and creative placeholders from a Shopify product',
  })
  @ApiResponse({
    status: 201,
    type: GenerateCampaignResponseDto,
  })
  generate(
    @Body() dto: GenerateCampaignDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GenerateCampaignResponseDto> {
    return this.campaignGeneratorService.generate(dto, currentUser);
  }
}
