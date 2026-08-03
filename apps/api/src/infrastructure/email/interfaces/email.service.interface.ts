export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Abstract email delivery. Swap the provider binding in EmailModule
 * to plug in SendGrid, Resend, SES, etc. without changing callers.
 */
export interface EmailService {
  send(params: SendEmailParams): Promise<void>;
}
