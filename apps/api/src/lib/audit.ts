import type { Request } from 'express';
import { query } from '../db';
import { logger } from './logger';

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (tenant_id, actor_id, actor_label, action, target_type, target_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.actor?.tenantId ?? req.tenantId ?? null,
        req.actor?.id ?? null,
        req.actor?.email ?? 'anonymous',
        entry.action,
        entry.targetType ?? null,
        entry.targetId ?? null,
        JSON.stringify(entry.metadata ?? {}),
        req.clientIp,
      ],
    );
  } catch (err) {
    logger.warn({ err, action: entry.action }, 'audit write failed');
  }
}
