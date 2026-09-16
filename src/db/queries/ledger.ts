import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { allocations, campaigns, transactions } from '@/db/schema';
import type { LedgerLine } from '@/lib/ledger/types';

export type TransactionRow = typeof transactions.$inferSelect;
export type AllocationRow = typeof allocations.$inferSelect;

const toLedgerLine = (a: AllocationRow): LedgerLine => ({
  id: a.id, campaignId: a.campaignId, periodId: a.periodId, amountKurus: a.amountKurus, reason: a.reason,
  transactionId: a.transactionId, transferGroupId: a.transferGroupId, note: a.note, createdAt: a.createdAt,
});

/** Lines that count publicly: transfers, or lines of a published transaction. */
export const publiclyCounted: SQL = or(isNull(allocations.transactionId), eq(transactions.published, true))!;

async function selectLines(campaignId: string, periodId: string | undefined, onlyCounted: boolean): Promise<LedgerLine[]> {
  const conds: SQL[] = [eq(allocations.campaignId, campaignId)];
  if (periodId) conds.push(eq(allocations.periodId, periodId));
  if (onlyCounted) conds.push(publiclyCounted);
  const rows = await db.select({ a: allocations }).from(allocations)
    .leftJoin(transactions, eq(allocations.transactionId, transactions.id))
    .where(and(...conds)).orderBy(desc(allocations.createdAt));
  return rows.map((r) => toLedgerLine(r.a));
}

export const getCountedLines = (campaignId: string, periodId?: string) => selectLines(campaignId, periodId, true);
export const getAllLines = (campaignId: string, periodId?: string) => selectLines(campaignId, periodId, false);

export interface LedgerRow {
  tx: TransactionRow;
  lines: { campaignId: string; campaignSlug: string; campaignTitle: { tr: string; en?: string }; amountKurus: number; reason: LedgerLine['reason']; periodId: string | null }[];
}

export async function listLedgerTransactions(opts: { campaignId?: string; month?: string; includeUnpublished?: boolean } = {}): Promise<LedgerRow[]> {
  const conds: SQL[] = [];
  if (!opts.includeUnpublished) conds.push(eq(transactions.published, true));
  if (opts.month) conds.push(sql`to_char(${transactions.occurredAt}, 'YYYY-MM') = ${opts.month}`);
  if (opts.campaignId) conds.push(sql`EXISTS (SELECT 1 FROM ${allocations} WHERE ${allocations.transactionId} = ${transactions.id} AND ${allocations.campaignId} = ${opts.campaignId})`);
  const txs = await db.select().from(transactions).where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
  if (txs.length === 0) return [];
  const lineRows = await db.select({ a: allocations, slug: campaigns.slug, title: campaigns.title }).from(allocations)
    .innerJoin(campaigns, eq(allocations.campaignId, campaigns.id))
    .where(inArray(allocations.transactionId, txs.map((t) => t.id)))
    .orderBy(asc(allocations.createdAt), asc(allocations.id));
  return txs.map((tx) => ({
    tx,
    lines: lineRows.filter((l) => l.a.transactionId === tx.id).map((l) => ({
      campaignId: l.a.campaignId, campaignSlug: l.slug, campaignTitle: l.title, amountKurus: l.a.amountKurus, reason: l.a.reason, periodId: l.a.periodId,
    })),
  }));
}

export async function getTransactionWithLines(id: string): Promise<{ tx: TransactionRow; lines: AllocationRow[] } | null> {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!tx) return null;
  const lines = await db.select().from(allocations).where(eq(allocations.transactionId, id))
    .orderBy(asc(allocations.createdAt), asc(allocations.id));
  return { tx, lines };
}

export interface HistoryRow {
  id: string; date: string; amountKurus: number; reason: LedgerLine['reason']; note: string | null;
  transactionId: string | null; receiptAttachmentId: string | null; displayName: string | null; periodId: string | null;
}

/** Publicly counted lines of a campaign with the transaction facts needed to display them. */
export async function getCampaignHistory(campaignId: string, periodId?: string): Promise<HistoryRow[]> {
  const conds: SQL[] = [eq(allocations.campaignId, campaignId), publiclyCounted];
  if (periodId) conds.push(eq(allocations.periodId, periodId));
  const rows = await db.select({ a: allocations, t: transactions }).from(allocations)
    .leftJoin(transactions, eq(allocations.transactionId, transactions.id))
    .where(and(...conds)).orderBy(desc(allocations.createdAt), desc(allocations.id));
  return rows.map(({ a, t }) => ({
    id: a.id, date: t?.occurredAt ?? a.createdAt.toISOString().slice(0, 10), amountKurus: a.amountKurus, reason: a.reason, note: a.note,
    transactionId: a.transactionId, receiptAttachmentId: t?.receiptAttachmentId ?? null, displayName: t?.displayName ?? null, periodId: a.periodId,
  }));
}
