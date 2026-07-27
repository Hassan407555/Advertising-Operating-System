import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationTriggerType } from '@prisma/client';

import { AutomationActionDefinitionDto } from './automation-action-definition.dto';

export class AutomationPipelineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdByUserId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    enum: AutomationTriggerType,
  })
  triggerType: AutomationTriggerType;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
  })
  triggerConfig: Record<string, unknown> | null;

  @ApiProperty({
    type: [AutomationActionDefinitionDto],
  })
  actions: AutomationActionDefinitionDto[];

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
