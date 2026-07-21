import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  AuditLog,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { AuditLogsResponse } from '../interfaces/audit-log.interface';

interface LogAuditParams {
  organizationId: string;
  actorId: string;

  action: AuditAction;
  entity: AuditEntity;
  entityId: string;

  metadata?: Prisma.JsonValue;

  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async log(
    params: LogAuditParams,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const prisma = tx ?? this.prisma;

    return prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findAll(
    organizationId: string,
    query: QueryAuditLogsDto,
  ): Promise<AuditLogsResponse> {
    const {
      action,
      entity,
      actorId,
      page,
      limit,
    } = query;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,

      ...(action && { action }),
      ...(entity && { entity }),
      ...(actorId && { actorId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.auditLog.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}