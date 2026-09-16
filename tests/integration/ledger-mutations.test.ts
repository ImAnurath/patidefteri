import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { allocations, campaigns, campaignPeriods, transactions } from '@/db/schema';
import { createDraftTransaction, suggestForTransaction, saveAllocations, recordTransfer, closePeriod, completeCampaign, updateTransaction } from '@/db/mutations/ledger';
import { getCampaignSummary, getGeneralBalance } from '@/db/queries/summaries';
import { makeTransfer } from '@/lib/ledger/transfers';
import { resetDb, seedAdmin, seedGeneral, seedAttachment } from './helpers';

async function setup() {
  const admin = await seedAdmin();
  const general = await seedGeneral();
  const [kori] = await db.insert(campaigns).values({ slug: 'kori', kind: 'one_off', status: 'active', keywords: ['kori'], title: { tr: 'Kori' }, description: { tr: 'x' }, targetKurus: 1050000 }).returning();
  const [mama] = await db.insert(campaigns).values({ slug: 'mama', kind: 'recurring', status: 'active', keywords: ['mama'], title: { tr: 'Mama' }, description: { tr: 'x' } }).returning();
  const [sep] = await db.insert(campaignPeriods).values({ campaignId: mama!.id, periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 300000 }).returning();
  return { admin, general, kori: kori!, mama: mama!, sep: sep! };
}
const draft = (amount: number, note: string | null, direction: 'in' | 'out' = 'in') =>
  ({ direction, amountKurus: amount, occurredAt: '2026-09-16', rawNote: note, displayName: 'O*** G***', receiptAttachmentId: null as string | null, redactionConfirmed: false });

describe('ledger mutations', () => {
  beforeEach(resetDb);

  it('draft → suggest → save publishes and moves the bar; status becomes funded', async () => {
    const { admin, kori } = await setup();
    const receipt = await seedAttachment();
    const t = await createDraftTransaction({ ...draft(1100000, 'Kori'), receiptAttachmentId: receipt.id, redactionConfirmed: true }, admin.id);
    const s = await suggestForTransaction(t.id);
    expect(s.lines).toEqual([{ campaignId: kori.id, periodId: null, amountKurus: 1100000, reason: 'note_match' }]);
    await saveAllocations(t.id, s.lines, true, admin.id);
    const sum = await getCampaignSummary((await db.select().from(campaigns).where(eq(campaigns.id, kori.id)))[0]!);
    expect(sum.kind === 'one_off' && sum.summary.raised).toBe(1100000);
    expect((await db.select().from(campaigns).where(eq(campaigns.id, kori.id)))[0]!.status).toBe('funded');
  });

  it('refuses to publish without a redacted receipt', async () => {
    const { admin, general } = await setup();
    const t = await createDraftTransaction(draft(100, null), admin.id);
    await expect(saveAllocations(t.id, [{ campaignId: general.id, periodId: null, amountKurus: 100, reason: 'manual' }], true, admin.id)).rejects.toThrow(/dekont/i);
  });

  it('recurring suggestion lands in the containing period and creates a missing month', async () => {
    const { admin, mama } = await setup();
    const t = await createDraftTransaction({ ...draft(50000, 'mama ekim') }, admin.id);
    const s = await suggestForTransaction(t.id);
    const periods = await db.select().from(campaignPeriods).where(eq(campaignPeriods.campaignId, mama.id));
    expect(periods.map((p) => p.periodStart).sort()).toEqual(['2026-09-01', '2026-10-01']);
    expect(s.lines[0]?.periodId).toBe(periods.find((p) => p.periodStart === '2026-10-01')!.id);
  });

  it('transfer, close period, and completion with surplus', async () => {
    const { admin, general, kori, mama, sep } = await setup();
    // donations
    const r1 = await seedAttachment();
    const t1 = await createDraftTransaction({ ...draft(1200000, 'kori'), receiptAttachmentId: r1.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t1.id, [{ campaignId: kori.id, periodId: null, amountKurus: 1200000, reason: 'note_match' }], true, admin.id);
    // expense
    const r2 = await seedAttachment('invoice');
    const t2 = await createDraftTransaction({ ...draft(1050000, 'ameliyat', 'out'), receiptAttachmentId: r2.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t2.id, [{ campaignId: kori.id, periodId: null, amountKurus: -1050000, reason: 'expense' }], true, admin.id);
    // complete: should move 150000 to general
    await completeCampaign(kori.id, { tr: 'Ameliyat oldu' }, admin.id);
    const [k] = await db.select().from(campaigns).where(eq(campaigns.id, kori.id));
    expect(k!.status).toBe('completed'); expect(k!.closedAt).not.toBeNull();
    expect(await getGeneralBalance()).toBe(150000);
    // recurring: 330000 collected, close → 30000 carried
    const r3 = await seedAttachment();
    const t3 = await createDraftTransaction({ ...draft(330000, 'mama'), receiptAttachmentId: r3.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t3.id, [{ campaignId: mama.id, periodId: sep.id, amountKurus: 330000, reason: 'note_match' }], true, admin.id);
    const r4 = await seedAttachment('invoice');
    const t4 = await createDraftTransaction({ ...draft(300000, 'mama faturası', 'out'), receiptAttachmentId: r4.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t4.id, [{ campaignId: mama.id, periodId: sep.id, amountKurus: -300000, reason: 'expense' }], true, admin.id);
    expect(await closePeriod(sep.id, admin.id)).toEqual({ carried: 30000 });
    const octLines = await db.select().from(allocations).where(eq(allocations.reason, 'carry_forward'));
    expect(octLines).toHaveLength(2);
    await expect(closePeriod(sep.id, admin.id)).rejects.toThrow(/kapal/i);
    // manual transfer general → mama october
    const oct = (await db.select().from(campaignPeriods).where(eq(campaignPeriods.campaignId, mama.id))).find((p) => p.periodStart === '2026-10-01')!;
    const gid = await recordTransfer(makeTransfer({ fromCampaignId: general.id, fromPeriodId: null, toCampaignId: mama.id, toPeriodId: oct.id, amountKurus: 50000, reason: 'top_up_from_general' }), 'acil', admin.id);
    expect(gid).toMatch(/[0-9a-f-]{36}/);
    expect(await getGeneralBalance()).toBe(100000);
  });

  it('completion is blocked without an expense', async () => {
    const { admin, kori } = await setup();
    await expect(completeCampaign(kori.id, null, admin.id)).rejects.toThrow(/harcama/i);
  });

  it('editing an amount without re-allocating is rejected by the database', async () => {
    const { admin, general } = await setup();
    const r = await seedAttachment();
    const t = await createDraftTransaction({ ...draft(1000, null), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t.id, [{ campaignId: general.id, periodId: null, amountKurus: 1000, reason: 'manual' }], true, admin.id);
    await expect(db.transaction(async (tx) => {
      await tx.update(transactions).set({ amountKurus: 900 }).where(eq(transactions.id, t.id));
    })).rejects.toThrow(/does not match/);
  });

  it('rejects allocation lines into a closed period', async () => {
    const { admin, mama, sep } = await setup();
    await closePeriod(sep.id, admin.id);
    const r = await seedAttachment();
    const t = await createDraftTransaction({ ...draft(10000, 'mama'), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id);
    await expect(saveAllocations(t.id, [{ campaignId: mama.id, periodId: sep.id, amountKurus: 10000, reason: 'note_match' }], true, admin.id))
      .rejects.toMatchObject({ name: 'LedgerError', code: 'PERIOD_CLOSED' });
    expect(await db.select().from(allocations).where(eq(allocations.transactionId, t.id))).toHaveLength(0);
  });

  it('rejects a transfer into a closed period', async () => {
    const { admin, general, mama, sep } = await setup();
    await closePeriod(sep.id, admin.id);
    const lines = makeTransfer({ fromCampaignId: general.id, fromPeriodId: null, toCampaignId: mama.id, toPeriodId: sep.id, amountKurus: 50000, reason: 'top_up_from_general' });
    await expect(recordTransfer(lines, null, admin.id)).rejects.toMatchObject({ name: 'LedgerError', code: 'PERIOD_CLOSED' });
  });

  it('rejects a line whose period belongs to another campaign', async () => {
    const { admin, mama } = await setup();
    const [kum] = await db.insert(campaigns).values({ slug: 'kum', kind: 'recurring', status: 'active', keywords: ['kum'], title: { tr: 'Kum' }, description: { tr: 'x' } }).returning();
    const [kumSep] = await db.insert(campaignPeriods).values({ campaignId: kum!.id, periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 100000 }).returning();
    const r = await seedAttachment();
    const t = await createDraftTransaction({ ...draft(10000, 'mama'), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id);
    await expect(saveAllocations(t.id, [{ campaignId: mama.id, periodId: kumSep!.id, amountKurus: 10000, reason: 'note_match' }], true, admin.id))
      .rejects.toMatchObject({ name: 'LedgerError', code: 'PERIOD_REQUIRED' });
  });

  it('re-validates lines on edit but leaves an unallocated draft editable', async () => {
    const { admin, general } = await setup();
    const r = await seedAttachment();
    const unallocated = await createDraftTransaction(draft(1000, null), admin.id);
    await updateTransaction(unallocated.id, { ...draft(900, null), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id);
    expect((await db.select().from(transactions).where(eq(transactions.id, unallocated.id)))[0]!.amountKurus).toBe(900);
    const t = await createDraftTransaction({ ...draft(1000, null), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id);
    await saveAllocations(t.id, [{ campaignId: general.id, periodId: null, amountKurus: 1000, reason: 'manual' }], true, admin.id);
    await expect(updateTransaction(t.id, { ...draft(900, null), receiptAttachmentId: r.id, redactionConfirmed: true }, admin.id))
      .rejects.toMatchObject({ name: 'LedgerError', code: 'LINES_SUM_MISMATCH' });
    expect((await db.select().from(transactions).where(eq(transactions.id, t.id)))[0]!.amountKurus).toBe(1000);
  });
});
