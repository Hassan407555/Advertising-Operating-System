import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateAiDto {
  @ApiProperty({
    example: 'Write a one-sentence product tagline for wireless earbuds.',
    description: 'Prompt text for the configured AI provider.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  prompt!: string;

  @ApiPropertyOptional({
    example: 'You are a concise marketing assistant.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @ApiPropertyOptional({
    example: 'gemini-2.0-flash',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    example: 0.7,
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    example: 1024,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxOutputTokens?: number;

  @ApiPropertyOptional({
    description:
      'When true, asks the provider for structured JSON and returns parsed data.',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  json?: boolean;

  @ApiPropertyOptional({
    example: '{ "tagline": "string" }',
    description: 'Optional schema hint used when json=true.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  schemaHint?: string;

  @ApiPropertyOptional({
    description: 'Optional template id from PromptRegistry.',
    example: 'plain_text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  templateId?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'Variables for template interpolation.',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;
}
