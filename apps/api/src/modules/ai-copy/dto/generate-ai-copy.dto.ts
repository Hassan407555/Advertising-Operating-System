import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateAiCopyDto {
  @ApiProperty({
    example: 'clxcampaign123',
    description: 'Campaign whose creatives should receive AI copy.',
  })
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @ApiProperty({
    example: 'clxorg123',
    description:
      'Organization ID. Must match the authenticated user organization.',
  })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
