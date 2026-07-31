import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import {
  AdvanceAiSessionDto,
  CreateAiSessionDto,
  ListAiSessionsQueryDto,
  SaveAiSessionDraftDto,
} from '../dto/ai-session.dto';
import { AiSessionsService } from '../services/ai-sessions.service';

@ApiTags('AI Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-sessions')
export class AiSessionsController {
  constructor(private readonly aiSessionsService: AiSessionsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'Create or reuse an active AI session (testing/internal). Products must use Advertising Entry instead.',
  })
  create(
    @Body() dto: CreateAiSessionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.create(dto, currentUser);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'List AI sessions' })
  list(
    @Query() query: ListAiSessionsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.list(query, currentUser);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'Get AI session snapshot' })
  getById(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.getById(id, currentUser, true);
  }

  @Get(':id/messages')
  @Roles('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  @ApiOperation({ summary: 'List conversation messages for an AI session' })
  listMessages(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.listMessages(id, currentUser);
  }

  @Post(':id/resume')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Resume an AI session' })
  resume(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.resume(id, currentUser);
  }

  @Post(':id/advance')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Advance AI session via orchestrator' })
  advance(
    @Param('id') id: string,
    @Body() dto: AdvanceAiSessionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.advance(id, dto, currentUser);
  }

  @Post(':id/generate')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'Generate Meta campaign via Gemini (Phase 6). Stores JSON in workflowContext; no draft entities.',
  })
  generate(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.generateCampaign(id, currentUser);
  }

  @Post(':id/generate-video')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({
    summary:
      'Generate a temporary product showcase video preview for a VIDEO campaign. Does not persist media on the AI session.',
  })
  generateVideo(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.generateVideoPreview(id, currentUser);
  }

  @Post(':id/save-draft')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary:
      'Phase 7 — Save reviewed campaign as draft entities (create or update). Session stays REVIEWING.',
  })
  saveDraft(
    @Param('id') id: string,
    @Body() dto: SaveAiSessionDraftDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.saveDraft(id, dto, currentUser);
  }

  @Post(':id/cancel')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Cancel an AI session' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.aiSessionsService.cancel(id, currentUser);
  }
}
