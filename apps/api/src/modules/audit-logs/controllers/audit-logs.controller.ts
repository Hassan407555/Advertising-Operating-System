import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuditLogsService } from '../services/audit-logs.service';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogsService.findAll(
      user.organizationId,
      query,
    );
  }
}