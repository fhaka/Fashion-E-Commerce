import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/**
 * DEVELOPMENT EMAIL PROVIDER — emails are written to the API log instead of being sent.
 * Used automatically when SMTP_HOST is not configured.
 */
class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(message: EmailMessage) {
    logger.info({ to: message.to, subject: message.subject }, `📧 [console email]\n${message.text}`);
  }
}

/** Sends through any SMTP service (Resend, Postmark, Amazon SES, Mailgun, SendGrid, Google Workspace…). */
class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private transport: Transporter;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Port 465 uses implicit TLS; other ports upgrade with STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: EmailMessage) {
    await this.transport.sendMail({ from: env.EMAIL_FROM, to: message.to, subject: message.subject, text: message.text });
  }
}

let provider: EmailProvider | null = null;
export function getEmailProvider(): EmailProvider {
  // Demo visitors type arbitrary addresses, so the public demo never sends real email.
  provider ??= env.SMTP_HOST && !env.DEMO_MODE ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  return provider;
}

/**
 * Sends an email without ever failing the caller: a mail outage must not break checkout,
 * registration or an admin action. Failures are logged for follow-up.
 */
export async function sendEmail(message: EmailMessage) {
  try {
    await getEmailProvider().send(message);
  } catch (err) {
    logger.error({ err: (err as Error).message, to: message.to, subject: message.subject }, 'Email delivery failed');
  }
}
