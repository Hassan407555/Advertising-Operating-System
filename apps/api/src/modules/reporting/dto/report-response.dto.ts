import {
  PlatformType,
  ReportFormat,
  ReportFrequency,
  ReportLevel,
} from '@prisma/client';

export class ReportScheduleResponseDto {
  id: string;

  frequency: ReportFrequency;

  timezone: string;

  recipients: string[] | null;

  isEnabled: boolean;

  lastRunAt: Date | null;

  nextRunAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export class ReportResponseDto {
  id: string;

  organizationId: string;

  createdByUserId: string;

  name: string;

  description: string | null;

  level: ReportLevel;

  platform: PlatformType | null;

  format: ReportFormat;

  filters: Record<string, unknown> | null;

  columns: Record<string, unknown> | null;

  isDefault: boolean;

  createdAt: Date;

  updatedAt: Date;

  schedules: ReportScheduleResponseDto[];
}