import { Injectable, Logger } from '@nestjs/common';

import {
  InvitationEmailService,
  SendInvitationEmailParams,
} from '../interfaces/invitation-email.service.interface';

/**
 * Local / development invitation email provider.
 * Logs the invitation URL instead of delivering email.
 * Replace with SMTP, SendGrid, Resend, or SES in production.
 */
@Injectable()
export class LocalEmailProvider implements InvitationEmailService {
  private readonly logger = new Logger(LocalEmailProvider.name);

  async sendInvitation(params: SendInvitationEmailParams): Promise<void> {
    this.logger.log(
      [
        `[local-invitation-email]`,
        `to=${params.to}`,
        `organization="${params.organizationName}"`,
        `role=${params.role}`,
        `expiresAt=${params.expiresAt.toISOString()}`,
        `invitationUrl=${params.invitationUrl}`,
      ].join(' '),
    );
  }
}
