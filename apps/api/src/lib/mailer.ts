import { query } from '../db';
import { logger } from './logger';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  tenantId?: string;
  userId?: string;
}

export async function sendEmail(message: OutboundEmail): Promise<void> {
  logger.info({ to: message.to, subject: message.subject }, 'dispatching transactional email');

  if (message.userId && message.tenantId) {
    await query(
      `INSERT INTO notifications (tenant_id, user_id, kind, title, body, severity)
       VALUES ($1, $2, 'email', $3, $4, 'info')`,
      [message.tenantId, message.userId, message.subject, message.body],
    ).catch((err) => logger.warn({ err }, 'notification mirror failed'));
  }
}
