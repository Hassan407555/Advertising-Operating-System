import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  AutomationRunStatus,
  AutomationTriggerType,
} from '@prisma/client';

import {
  AUTOMATION_DEFAULT_LIMIT,
  AUTOMATION_DEFAULT_PAGE,
  AUTOMATION_DEFAULT_SORT_BY,
  AUTOMATION_DEFAULT_SORT_ORDER,
  AUTOMATION_RUN_SORT_FIELDS,
} from '../constants/automation.constants';

export class AutomationRunQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = AUTOMATION_DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = AUTOMATION_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  pipelineId?: string;

  @IsOptional()
  @IsEnum(AutomationRunStatus)
  status?: AutomationRunStatus;

  @IsOptional()
  @IsEnum(AutomationTriggerType)
  triggerType?: AutomationTriggerType;

  @IsOptional()
  @IsIn(AUTOMATION_RUN_SORT_FIELDS)
  sortBy = AUTOMATION_DEFAULT_SORT_BY;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' =
    AUTOMATION_DEFAULT_SORT_ORDER;
}
