import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiUsageDto {
  @ApiPropertyOptional()
  inputTokens?: number;

  @ApiPropertyOptional()
  outputTokens?: number;

  @ApiPropertyOptional()
  totalTokens?: number;
}

export class GenerateAiResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    example: 'GEMINI',
  })
  provider!: string;

  @ApiProperty({
    example: 'gemini-2.0-flash',
  })
  model!: string;

  @ApiPropertyOptional({
    example: 'Sound that stays with you.',
  })
  text?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'Present when json mode is requested.',
  })
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: AiUsageDto,
  })
  usage?: AiUsageDto;
}
