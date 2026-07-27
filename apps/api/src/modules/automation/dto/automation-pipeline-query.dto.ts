import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AutomationTriggerType } from '@prisma/client';

import {
  AUTOMATION_DEFAULT_LIMIT,
  AUTOMATION_DEFAULT_PAGE,
  AUTOMATION_DEFAULT_SORT_BY,
  AUTOMATION_DEFAULT_SORT_ORDER,
  AUTOMATION_PIPELINE_SORT_FIELDS,
} from '../constants/automation.constants';

export class AutomationPipelineQueryDto {
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
  search?: string;

  @IsOptional()
  @IsEnum(AutomationTriggerType)
  triggerType?: AutomationTriggerType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsIn(AUTOMATION_PIPELINE_SORT_FIELDS)
  sortBy = AUTOMATION_DEFAULT_SORT_BY;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' =
    AUTOMATION_DEFAULT_SORT_ORDER;
}
