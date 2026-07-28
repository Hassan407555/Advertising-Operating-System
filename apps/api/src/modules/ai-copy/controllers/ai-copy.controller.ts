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
import { MembershipRole } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { GenerateAiCopyDto } from '../dto/generate-ai-copy.dto';
import { GenerateAiCopyResponseDto } from '../dto/generate-ai-copy-response.dto';
import { AiCopyService } from '../services/ai-copy.service';

@ApiTags('AI Copy')
@ApiBearerAuth()
@Controller('ai-copy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiCopyController {
  constructor(private readonly aiCopyService: AiCopyService) {}

  @Post('generate')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary:
      'Generate AI marketing copy for creatives linked to a campaign via the AI gateway',
  })
  @ApiResponse({
    status: 201,
    type: GenerateAiCopyResponseDto,
  })
  generate(
    @Body() dto: GenerateAiCopyDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GenerateAiCopyResponseDto> {
    return this.aiCopyService.generate(dto, currentUser);
  }
}
