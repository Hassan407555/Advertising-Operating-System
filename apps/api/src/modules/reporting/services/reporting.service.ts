import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  AuditEntity,
  PlatformType,
  Prisma,
  ReportFormat,
  ReportLevel,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UpdateReportDto } from '../dto/update-report.dto';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';


import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportMapper } from '../mappers/reporting.mapper';
import {
  DEFAULT_SORT_BY,
  REPORT_INCLUDE,
  REPORT_SORT_FIELDS,
  type ReportSortField,
} from '../constants/reporting.constants';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportResponseDto } from '../dto/report-response.dto';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
  private readonly prisma: PrismaService,
  private readonly auditLogsService: AuditLogsService,
  private readonly reportMapper: ReportMapper,
) {}

 async create(
  dto: CreateReportDto,
  currentUser: JwtPayload,
): Promise<ReportResponseDto> {
  try {
    return await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          organizationId: currentUser.organizationId,
          createdByUserId: currentUser.sub,

          name: dto.name,
          description: dto.description,

          level: dto.level,
          platform: dto.platform ?? null,
          format: dto.format,

          filters: dto.filters
            ? JSON.parse(dto.filters)
            : Prisma.JsonNull,

          columns: dto.columns
            ? JSON.parse(dto.columns)
            : Prisma.JsonNull,
        },

        include: REPORT_INCLUDE,
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.REPORT_CREATED,
          entity: AuditEntity.REPORT,
          entityId: report.id,
          metadata: {
            reportName: report.name,
          },
        },
        tx,
      );

      this.logger.log({
        message: 'Report created.',
        reportId: report.id,
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
      });

      return this.reportMapper.toResponse(report);
    });
  } catch (error) {
    this.handlePrismaError(error);

    throw error;
  }
}
async update(
  id: string,
  dto: UpdateReportDto,
  currentUser: JwtPayload,
): Promise<ReportResponseDto> {
  try {
    return await this.prisma.$transaction(async (tx) => {
      await this.getReportOrThrow(
        id,
        currentUser.organizationId,
        tx,
      );

      const report = await tx.report.update({
        where: {
          id,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name,
          }),

          ...(dto.description !== undefined && {
            description: dto.description,
          }),

          ...(dto.level !== undefined && {
            level: dto.level,
          }),

          ...(dto.platform !== undefined && {
            platform: dto.platform,
          }),

          ...(dto.format !== undefined && {
            format: dto.format,
          }),

          ...(dto.filters !== undefined && {
            filters: dto.filters
              ? JSON.parse(dto.filters)
              : Prisma.JsonNull,
          }),

          ...(dto.columns !== undefined && {
            columns: dto.columns
              ? JSON.parse(dto.columns)
              : Prisma.JsonNull,
          }),
        },
        include: REPORT_INCLUDE,
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.REPORT_UPDATED,
          entity: AuditEntity.REPORT,
          entityId: report.id,
          metadata: {
            reportName: report.name,
          },
        },
        tx,
      );

      this.logger.log({
        message: 'Report updated.',
        reportId: report.id,
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
      });

      return this.reportMapper.toResponse(report);
    });
  } catch (error) {
    this.handlePrismaError(error);

    throw error;
  }
}


async findAll(
  query: ReportQueryDto,
  currentUser: JwtPayload,
): Promise<PaginatedResponseDto<ReportResponseDto>> {
  const {
    page,
    limit,
    search,
    level,
    format,
    platform,
    sortBy,
    sortOrder,
  } = query;

  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search,
    level,
    format,
    platform,
  });

  const safeSortBy = this.ensureValidSortField(sortBy);

  const skip = (page - 1) * limit;

  const [reports, total] = await this.prisma.$transaction([
    this.prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [safeSortBy]: sortOrder,
      },
      include: REPORT_INCLUDE,
    }),

    this.prisma.report.count({
      where,
    }),
  ]);

  this.logger.debug({
    message: 'Reports retrieved.',
    organizationId: currentUser.organizationId,
    page,
    limit,
    total,
  });

  return {
    data: reports.map((report) =>
      this.reportMapper.toResponse(report),
    ),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
async findOne(
  id: string,
  currentUser: JwtPayload,
): Promise<ReportResponseDto> {
  const report = await this.prisma.report.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
    include: REPORT_INCLUDE,
  });

  if (!report) {
    throw new NotFoundException('Report not found.');
  }

  return this.reportMapper.toResponse(report);
}


async remove(
  id: string,
  currentUser: JwtPayload,
): Promise<void> {
  try {
    await this.prisma.$transaction(async (tx) => {
      const report = await this.getReportOrThrow(
        id,
        currentUser.organizationId,
        tx,
      );

      if (report.deletedAt) {
        throw new NotFoundException(
          'Report not found.',
        );
      }

      await tx.report.update({
        where: {
          id: report.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.log({
        message: 'Report deleted.',
        reportId: report.id,
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
      });
    });
  } catch (error) {
    this.handlePrismaError(error);
  }
}

private buildWhereClause(filters: {
  organizationId: string;
  search?: string;
  level?: ReportLevel;
  format?: ReportFormat;
  platform?: PlatformType;
}): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = {
    organizationId: filters.organizationId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.format) {
    where.format = filters.format;
  }

  if (filters.platform) {
    where.platform = filters.platform;
  }

  return where;
}

private ensureValidSortField(
  sortBy?: string,
): ReportSortField {
  if (
    sortBy &&
    REPORT_SORT_FIELDS.includes(
      sortBy as ReportSortField,
    )
  ) {
    return sortBy as ReportSortField;
  }

  return DEFAULT_SORT_BY;
}
private async getReportOrThrow(
  reportId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
) {
  const report = await tx.report.findFirst({
    where: {
      id: reportId,
      organizationId,
      deletedAt: null,
    },
    include: REPORT_INCLUDE,
  });

  if (!report) {
    throw new NotFoundException('Report not found.');
  }

  return report;
}

private handlePrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          'A report with the same name already exists.',
        );

      case 'P2025':
        throw new NotFoundException('Report not found.');
    }
  }

  throw error;
}
}