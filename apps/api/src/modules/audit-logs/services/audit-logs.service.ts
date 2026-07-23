import { Injectable, Logger } from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  AuditLog,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { AuditLogsResponse } from '../interfaces/audit-log.interface';

interface LogAuditParams {
  organizationId: string;
  actorId: string;

  action: AuditAction;
  entity: AuditEntity;
  entityId: string;

  metadata?: Prisma.InputJsonValue;

  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    params: LogAuditParams,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const prisma = tx ?? this.prisma;

    try {
      return await prisma.auditLog.create({
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
    } catch (error) {
      console.log('\n========================================');
      console.log('AUDIT LOG CREATE FAILED');
      console.log('========================================');

      console.log('\nPARAMS:');
      console.dir(params, { depth: null });

      console.log('\nERROR OBJECT:');
      console.dir(error, { depth: null });

      if (error instanceof PrismaClientKnownRequestError) {
        console.log('\nPRISMA ERROR');
        console.log('Code:', error.code);
        console.log('Meta:', error.meta);
      }

      if (error instanceof Error) {
        console.log('\nSTACK TRACE');
        console.log(error.stack);
      }

      this.logger.error('Audit log creation failed');

      throw error;
    }
  }

  async findAll(
    organizationId: string,
    query: QueryAuditLogsDto,
  ): Promise<AuditLogsResponse> {
    const { action, entity, actorId, page, limit } = query;

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