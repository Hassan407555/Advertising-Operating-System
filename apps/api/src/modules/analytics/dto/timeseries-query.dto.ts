import { IsIn, IsOptional } from 'class-validator';

import { AnalyticsQueryDto } from './analytics-query.dto';

export class TimeSeriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';
}