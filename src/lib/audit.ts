import type { Tx } from '@/db/client';
import { auditLog } from '@/db/schema';

export interface AuditEntry {
  actorId: string | null;
  action: string;   // e.g. 'transaction.create'
  entity: string;   // e.g. 'transactions'
  entityId?: string | null;
  diff?: Record<string, unknown>;
}

export async function writeAudit(tx: Tx, e: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({ actorId: e.actorId, action: e.action, entity: e.entity, entityId: e.entityId ?? null, diff: e.diff ?? null });
}
