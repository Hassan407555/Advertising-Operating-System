import { Injectable } from '@nestjs/common';

import { ReportWithRelations } from '../constants/reporting.constants';
import { ReportResponseDto } from '../dto/report-response.dto';

@Injectable()
export class ReportMapper {
  toResponse(report: ReportWithRelations): ReportResponseDto {
    return {
      id: report.id,
      organizationId: report.organizationId,
      createdByUserId: report.createdByUserId,

      name: report.name,
      description: report.description,

      level: report.level,
      platform: report.platform,
      format: report.format,

      filters: report.filters as Record<string, unknown> | null,
      columns: report.columns as Record<string, unknown> | null,

      isDefault: report.isDefault,

      createdAt: report.createdAt,
      updatedAt: report.updatedAt,

      schedules: report.schedules.map((schedule) => ({
        id: schedule.id,

        frequency: schedule.frequency,

        timezone: schedule.timezone,

        recipients: (schedule.recipients as string[] | null) ?? null,

        isEnabled: schedule.isEnabled,

        lastRunAt: schedule.lastRunAt,
        nextRunAt: schedule.nextRunAt,

        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      })),
    };
  }
}