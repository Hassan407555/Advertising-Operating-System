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

import { GenerateAiDto } from '../dto/generate-ai.dto';
import { GenerateAiResponseDto } from '../dto/generate-ai-response.dto';
import { AiMapper } from '../mappers/ai.mapper';
import { AiService } from '../services/ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiMapper: AiMapper,
  ) {}

  @Post('generate')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
  )
  @ApiOperation({
    summary:
      'Development/test endpoint for the AI gateway (uses configured provider)',
  })
  @ApiResponse({
    status: 201,
    type: GenerateAiResponseDto,
  })
  async generate(
    @Body() dto: GenerateAiDto,
    @CurrentUser() _currentUser: JwtPayload,
  ): Promise<GenerateAiResponseDto> {
    if (dto.templateId) {
      if (dto.json) {
        const result = await this.aiService.generateJsonFromTemplate(
          {
            templateId: dto.templateId,
            variables: {
              prompt: dto.prompt,
              schemaHint: dto.schemaHint,
              ...(dto.variables ?? {}),
            },
          },
          {
            model: dto.model,
            temperature: dto.temperature,
            maxOutputTokens: dto.maxOutputTokens,
            schemaHint: dto.schemaHint,
          },
        );

        return this.aiMapper.toJsonResponse(result);
      }

      const result = await this.aiService.generateFromTemplate(
        {
          templateId: dto.templateId,
          variables: {
            prompt: dto.prompt,
            ...(dto.variables ?? {}),
          },
        },
        {
          model: dto.model,
          temperature: dto.temperature,
          maxOutputTokens: dto.maxOutputTokens,
        },
      );

      return this.aiMapper.toTextResponse(result);
    }

    if (dto.json) {
      const result = await this.aiService.generateJson({
        prompt: dto.prompt,
        systemPrompt: dto.systemPrompt,
        model: dto.model,
        temperature: dto.temperature,
        maxOutputTokens: dto.maxOutputTokens,
        schemaHint: dto.schemaHint,
      });

      return this.aiMapper.toJsonResponse(result);
    }

    const result = await this.aiService.generateText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      model: dto.model,
      temperature: dto.temperature,
      maxOutputTokens: dto.maxOutputTokens,
    });

    return this.aiMapper.toTextResponse(result);
  }
}
