import { Injectable } from '@nestjs/common';

import type {
  AiJsonResult,
  AiTextResult,
} from '../providers/interfaces/ai-provider.interface';
import { GenerateAiResponseDto } from '../dto/generate-ai-response.dto';

@Injectable()
export class AiMapper {
  toTextResponse(result: AiTextResult): GenerateAiResponseDto {
    return {
      success: true,
      provider: result.provider,
      model: result.model,
      text: result.text,
      usage: result.usage,
    };
  }

  toJsonResponse(
    result: AiJsonResult<Record<string, unknown>>,
  ): GenerateAiResponseDto {
    return {
      success: true,
      provider: result.provider,
      model: result.model,
      text: result.rawText,
      data: result.data,
      usage: result.usage,
    };
  }
}
