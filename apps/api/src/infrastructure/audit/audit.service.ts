import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AuditEvent } from './audit-event.interface';

@Injectable()
export class AuditService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AuditService.name);
  }

  record(event: AuditEvent): void {
    this.logger.info(
      {
        audit: {
          ...event,
          occurredAt: (event.occurredAt ?? new Date()).toISOString(),
        },
      },
      'Audit event captured',
    );
  }
}
