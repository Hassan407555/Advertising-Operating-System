import {
  IsIn,
  IsOptional,
} from 'class-validator';

import { AnalyticsQueryDto } from './analytics-query.dto';

export const BREAKDOWN_DIMENSIONS = [
  'campaign',
  'adSet',
  'ad',
  'creative',
] as const;

export type BreakdownDimension =
  (typeof BREAKDOWN_DIMENSIONS)[number];

export class AnalyticsBreakdownDto
  extends AnalyticsQueryDto
{
  @IsOptional()
  @IsIn(BREAKDOWN_DIMENSIONS)
  dimension: BreakdownDimension = 'campaign';
}
