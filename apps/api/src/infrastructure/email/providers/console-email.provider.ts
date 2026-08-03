import { Injectable, Logger } from '@nestjs/common';

import {
  EmailService,
  SendEmailParams,
} from '../interfaces/email.service.interface';

/**
 * Development email provider — logs messages instead of sending.
 * Replace with SendGrid / Resend / SES providers in production.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailService {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(params: SendEmailParams): Promise<void> {
    this.logger.log(
      `[dev-email] to=${params.to} subject="${params.subject}"\n${params.text}`,
    );
  }
}
