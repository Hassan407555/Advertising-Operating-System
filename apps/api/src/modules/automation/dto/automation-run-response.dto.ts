import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AutomationActionType,
  AutomationRunStatus,
  AutomationStepStatus,
  AutomationTriggerType,
} from '@prisma/client';

export class AutomationStepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  runId: string;

  @ApiProperty({
    enum: AutomationActionType,
  })
  actionType: AutomationActionType;

  @ApiProperty()
  stepOrder: number;

  @ApiProperty({
    enum: AutomationStepStatus,
  })
  status: AutomationStepStatus;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
  })
  input: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
  })
  output: Record<string, unknown> | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  errorMessage: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  startedAt: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  completedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AutomationRunResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  pipelineId: string;

  @ApiProperty({
    enum: AutomationTriggerType,
  })
  triggerType: AutomationTriggerType;

  @ApiProperty({
    enum: AutomationRunStatus,
  })
  status: AutomationRunStatus;

  @ApiPropertyOptional({
    nullable: true,
  })
  triggeredByUserId: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  startedAt: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  completedAt: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  errorMessage: string | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    type: [AutomationStepResponseDto],
  })
  steps: AutomationStepResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
