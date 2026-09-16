import { and, desc, eq } from 'drizzle-orm';
import { db, type Tx } from '@/db/client';
import { allocations, campaigns, campaignPeriods, transactions } from '@/db/schema';
import { writeAudit } from '@/lib/audit';
import type { Localized } from '@/lib/i18n/localized';
import {
  LedgerError, deriveOneOffStatus, nextMonthPeriod, planCarryForward, planCompletion, suggestAllocations, summarizeGeneral, summarizeOneOff,
  summarizePeriod, validateTransactionLines, validateTransferLines, type AllocationLine, type CampaignRef, type Suggestion, type TxDirection,
} from '@/lib/ledger';
import { ensurePeriod, getGeneralCampaign, toCampaignRef, toPeriodRef } from '@/db/queries/campaigns';
import { publiclyCounted, type TransactionRow } from '@/db/queries/ledger';

export interface DraftInput {
  direction: TxDirection; amountKurus: number; occurredAt: string; rawNote: string | null; displayName: string | null;
  receiptAttachmentId: string | null; redactionConfirmed: boolean;
}

const DEFAULT_RECURRING_TARGET = 300000; // used only when a recurring campaign has no period yet; admin edits it afterwards

/** The query layer's "publicly counted" rule, scoped to an open transaction: transfers, or lines of a published transaction. */
async function countedLines(tx: Tx, campaignId: string, periodId?: string): Promise<AllocationLine[]> {
  const conds = [eq(allocations.campaignId, campaignId), publiclyCounted];
  if (periodId) conds.push(eq(allocations.periodId, periodId));
  const rows = await tx.select({ a: allocations }).from(allocations).leftJoin(transactions, eq(allocations.transactionId, transactions.id)).where(and(...conds));
  return rows.map((r) => ({ campaignId: r.a.campaignId, periodId: r.a.periodId, amountKurus: r.a.amountKurus, reason: r.a.reason }));
}

/** Campaign refs by id, for the invariant checks that need each campaign's kind. */
async function campaignRefs(tx: Tx): Promise<Map<string, CampaignRef>> {
  return new Map((await tx.select().from(campaigns)).map((c) => [c.id, toCampaignRef(c)] as [string, CampaignRef]));
}

/**
 * A line naming a period must name an open period of its own campaign. A closed period has already been
 * carried forward, so money written into it afterwards is stranded: no summary would ever report it.
 */
async function assertPeriodsUsable(tx: Tx, lines: readonly AllocationLine[]): Promise<void> {
  for (const l of lines) {
    if (!l.periodId) continue;
    const [p] = await tx.select().from(campaignPeriods).where(eq(campaignPeriods.id, l.periodId)).limit(1);
    if (!p || p.campaignId !== l.campaignId) throw new LedgerError('PERIOD_REQUIRED', 'Dönem kampanyaya ait değil');
    if (p.closedAt) throw new LedgerError('PERIOD_CLOSED', `Dönem kapalı: ${p.periodStart}`);
  }
}

async function refreshOneOffStatus(tx: Tx, campaignId: string): Promise<void> {
  const [c] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!c || c.kind !== 'one_off') return;
  const { raised } = summarizeOneOff(await countedLines(tx, c.id), c.targetKurus);
  const next = deriveOneOffStatus(c.status, raised, c.targetKurus);
  if (next !== c.status) await tx.update(campaigns).set({ status: next, updatedAt: new Date() }).where(eq(campaigns.id, c.id));
}

export async function createDraftTransaction(input: DraftInput, actorId: string): Promise<TransactionRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(transactions).values({ ...input, source: 'manual', enteredBy: actorId }).returning();
    await writeAudit(tx, { actorId, action: 'transaction.create', entity: 'transactions', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export async function updateTransaction(id: string, input: DraftInput, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!before) throw new Error('İşlem bulunamadı');
    const lines = await tx.select().from(allocations).where(eq(allocations.transactionId, id));
    // An unallocated draft has no lines yet and stays freely editable; once allocated, the edited
    // amount must still match its lines, so the admin sees a ledger error instead of raw trigger text.
    if (lines.length > 0) validateTransactionLines(input.direction, input.amountKurus, lines, await campaignRefs(tx));
    const [after] = await tx.update(transactions).set({ ...input, updatedAt: new Date() }).where(eq(transactions.id, id)).returning();
    await writeAudit(tx, { actorId, action: 'transaction.update', entity: 'transactions', entityId: id, diff: { before, after } });
    for (const cid of new Set(lines.map((l) => l.campaignId))) await refreshOneOffStatus(tx, cid);
  });
}

export async function suggestForTransaction(txId: string): Promise<Suggestion> {
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!t) throw new Error('İşlem bulunamadı');
    const rows = await tx.select().from(campaigns);
    const general = rows.find((c) => c.kind === 'general');
    if (!general) throw new Error('Genel bütçe kampanyası yok');
    // make sure every active recurring campaign has the period for this date and the next month (for month mentions)
    for (const c of rows.filter((c) => c.kind === 'recurring' && (c.status === 'active' || c.status === 'funded'))) {
      const [latest] = await tx.select().from(campaignPeriods).where(eq(campaignPeriods.campaignId, c.id))
        .orderBy(desc(campaignPeriods.periodStart)).limit(1);
      const target = latest?.targetKurus ?? DEFAULT_RECURRING_TARGET;
      const cur = await ensurePeriod(tx, c.id, t.occurredAt, target);
      await ensurePeriod(tx, c.id, nextMonthPeriod(cur.periodStart).periodStart, cur.targetKurus);
    }
    const periods = (await tx.select().from(campaignPeriods)).map(toPeriodRef);
    if (t.direction === 'out') {
      return { lines: [{ campaignId: general.id, periodId: null, amountKurus: -t.amountKurus, reason: 'expense' }], matchedCampaignIds: [] };
    }
    return suggestAllocations({ note: t.rawNote, amountKurus: t.amountKurus, occurredAt: t.occurredAt, campaigns: rows.map(toCampaignRef), periods, generalId: general.id });
  });
}

export async function saveAllocations(txId: string, lines: AllocationLine[], publish: boolean, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!t) throw new Error('İşlem bulunamadı');
    if (publish && (!t.receiptAttachmentId || !t.redactionConfirmed)) throw new Error('Yayınlamak için dekont yüklenmiş ve kişisel verilerin gizlendiği onaylanmış olmalı.');
    const refs = await campaignRefs(tx);
    validateTransactionLines(t.direction, t.amountKurus, lines, refs);
    await assertPeriodsUsable(tx, lines);
    const before = await tx.select().from(allocations).where(eq(allocations.transactionId, txId));
    await tx.delete(allocations).where(eq(allocations.transactionId, txId));
    await tx.insert(allocations).values(lines.map((l) => ({ ...l, transactionId: txId, createdBy: actorId })));
    await tx.update(transactions).set({ published: publish, updatedAt: new Date() }).where(eq(transactions.id, txId));
    await writeAudit(tx, { actorId, action: 'transaction.allocate', entity: 'transactions', entityId: txId, diff: { before, after: lines, publish } });
    for (const cid of new Set([...before.map((l) => l.campaignId), ...lines.map((l) => l.campaignId)])) await refreshOneOffStatus(tx, cid);
  });
}

export async function unpublishTransaction(txId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({ published: false, updatedAt: new Date() }).where(eq(transactions.id, txId));
    await writeAudit(tx, { actorId, action: 'transaction.unpublish', entity: 'transactions', entityId: txId });
    const lines = await tx.select().from(allocations).where(eq(allocations.transactionId, txId));
    for (const cid of new Set(lines.map((l) => l.campaignId))) await refreshOneOffStatus(tx, cid);
  });
}

export async function recordTransfer(lines: AllocationLine[], note: string | null, actorId: string): Promise<string> {
  return db.transaction(async (tx) => {
    validateTransferLines(lines, await campaignRefs(tx));
    await assertPeriodsUsable(tx, lines);
    const transferGroupId = crypto.randomUUID();
    await tx.insert(allocations).values(lines.map((l) => ({ ...l, transferGroupId, note, createdBy: actorId })));
    await writeAudit(tx, { actorId, action: 'transfer.create', entity: 'allocations', entityId: transferGroupId, diff: { lines, note } });
    for (const cid of new Set(lines.map((l) => l.campaignId))) await refreshOneOffStatus(tx, cid);
    return transferGroupId;
  });
}

export async function closePeriod(periodId: string, actorId: string): Promise<{ carried: number }> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(campaignPeriods).where(eq(campaignPeriods.id, periodId)).limit(1);
    if (!p) throw new Error('Dönem bulunamadı');
    if (p.closedAt) throw new Error('Dönem zaten kapalı');
    const { balance } = summarizePeriod(await countedLines(tx, p.campaignId, p.id), p.targetKurus);
    const next = await ensurePeriod(tx, p.campaignId, nextMonthPeriod(p.periodStart).periodStart, p.targetKurus);
    const lines = planCarryForward(toPeriodRef(p), next.id, balance);
    if (lines) {
      validateTransferLines(lines, await campaignRefs(tx));
      // `ensurePeriod` hands back an existing next period even when it is already closed, so closing
      // months out of order would carry into a closed month. Both endpoints are still open in the
      // normal flow, because this period's `closedAt` is only set below.
      await assertPeriodsUsable(tx, lines);
      const transferGroupId = crypto.randomUUID();
      await tx.insert(allocations).values(lines.map((l) => ({ ...l, transferGroupId, createdBy: actorId, note: 'Dönem kapanışı devri' })));
    }
    await tx.update(campaignPeriods).set({ closedAt: new Date() }).where(eq(campaignPeriods.id, periodId));
    await writeAudit(tx, { actorId, action: 'period.close', entity: 'campaign_periods', entityId: periodId, diff: { carried: lines ? balance : 0, nextPeriodId: next.id } });
    return { carried: lines ? balance : 0 };
  });
}

export async function completeCampaign(campaignId: string, closingNote: Localized | null, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!c || c.kind !== 'one_off') throw new Error('Sadece tek seferlik kampanyalar tamamlanır');
    const general = await getGeneralCampaign(tx);
    const generalBalance = summarizeGeneral(await countedLines(tx, general.id)).balance;
    let plan = planCompletion({ campaign: toCampaignRef(c), lines: await countedLines(tx, c.id), generalId: general.id, generalBalance });
    if (plan.blocker === 'NO_EXPENSE') throw new Error('Tamamlamak için en az bir harcama kaydı gerekir.');
    if (plan.blocker === 'WRONG_STATUS') throw new Error('Kampanya aktif veya hedefe ulaşmış durumda olmalı.');
    if (plan.blocker === 'GENERAL_INSUFFICIENT') throw new Error('Genel bütçe açığı karşılamaya yetmiyor.');
    if (plan.suggestedTransfer) {
      validateTransferLines(plan.suggestedTransfer, await campaignRefs(tx));
      const transferGroupId = crypto.randomUUID();
      await tx.insert(allocations).values(plan.suggestedTransfer.map((l) => ({ ...l, transferGroupId, createdBy: actorId, note: 'Kampanya kapanışı' })));
      // The transfer just moved money in or out of the general budget, so re-read its balance too.
      plan = planCompletion({
        campaign: toCampaignRef(c), lines: await countedLines(tx, c.id), generalId: general.id,
        generalBalance: summarizeGeneral(await countedLines(tx, general.id)).balance,
      });
    }
    if (!plan.canComplete) throw new Error('Kampanya kapatılamadı: bakiye sıfır değil.');
    await tx.update(campaigns).set({ status: 'completed', closedAt: new Date(), closingNote, updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
    await writeAudit(tx, { actorId, action: 'campaign.complete', entity: 'campaigns', entityId: campaignId, diff: { closingNote } });
  });
}
