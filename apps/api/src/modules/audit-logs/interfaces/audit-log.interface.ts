import { AuditLog } from '@prisma/client';

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}