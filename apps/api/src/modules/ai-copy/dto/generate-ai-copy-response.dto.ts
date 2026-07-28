import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratedCreativeCopyDto {
  @ApiProperty()
  creativeId!: string;

  @ApiPropertyOptional()
  productId?: string;

  @ApiProperty({
    type: [String],
  })
  adIds!: string[];

  @ApiProperty()
  headline!: string;

  @ApiProperty()
  primaryText!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    example: 'Shop Now',
  })
  cta!: string;

  @ApiProperty()
  suggestedHook!: string;

  @ApiProperty({
    type: [String],
  })
  painPoints!: string[];

  @ApiProperty({
    type: [String],
  })
  benefits!: string[];

  @ApiProperty()
  targetAudienceSummary!: string;

  @ApiProperty()
  offerAngle!: string;

  @ApiProperty()
  marketingAngle!: string;

  @ApiProperty()
  platformNotes!: string;

  @ApiProperty()
  tone!: string;

  @ApiProperty({
    example: 'GEMINI',
  })
  provider!: string;

  @ApiProperty({
    example: 'gemini-2.0-flash',
  })
  model!: string;
}

export class AiCopyExecutionMetadataDto {
  @ApiProperty({
    example: 'GEMINI',
  })
  provider!: string;

  @ApiPropertyOptional({
    example: 'gemini-2.0-flash',
  })
  model?: string;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  completedAt!: string;

  @ApiProperty({
    description: 'Wall-clock duration in milliseconds.',
    example: 4821,
  })
  durationMs!: number;
}

export class GenerateAiCopyResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: boolean;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  creativesProcessed!: number;

  @ApiProperty()
  adsProcessed!: number;

  @ApiProperty({
    type: AiCopyExecutionMetadataDto,
  })
  execution!: AiCopyExecutionMetadataDto;

  @ApiProperty({
    type: [GeneratedCreativeCopyDto],
  })
  generated!: GeneratedCreativeCopyDto[];
}
