import { MembershipRole } from '@prisma/client';

export interface SendInvitationEmailParams {
  to: string;
  organizationName: string;
  role: MembershipRole;
  invitationUrl: string;
  expiresAt: Date;
}

/**
 * Invitation-specific email delivery.
 * Swap LocalEmailProvider for SMTP / SendGrid / Resend / SES
 * without changing InvitationsService business logic.
 */
export interface InvitationEmailService {
  sendInvitation(params: SendInvitationEmailParams): Promise<void>;
}
