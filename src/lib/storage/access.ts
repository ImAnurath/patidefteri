import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { transactions } from '@/db/schema';
import type { Attachment } from './upload';

/** Receipts and invoices are public only through a published, redaction-confirmed transaction. Photos and documents are public. */
export async function canServeAttachment(att: Attachment): Promise<boolean> {
  if (att.kind === 'photo' || att.kind === 'document') return true;
  const [row] = await db.select({ id: transactions.id }).from(transactions)
    .where(and(eq(transactions.receiptAttachmentId, att.id), eq(transactions.published, true), eq(transactions.redactionConfirmed, true)))
    .limit(1);
  return Boolean(row);
}
