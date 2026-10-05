import { logger } from '../../config/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * DEVELOPMENT EMAIL PROVIDER — emails are written to the API log instead of being sent.
 * To send real email, implement EmailProvider with Resend, Postmark, SES, etc. and
 * return it from `getEmailProvider()` when its API key is configured.
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    logger.info({ to: message.to, subject: message.subject }, `📧 [console email]\n${message.text}`);
  }
}

let provider: EmailProvider | null = null;
export function getEmailProvider(): EmailProvider {
  provider ??= new ConsoleEmailProvider();
  return provider;
}

export const sendEmail = (message: EmailMessage) => getEmailProvider().send(message);
