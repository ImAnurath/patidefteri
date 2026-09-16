import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { allocations, campaigns, transactions } from '@/db/schema';
import { getCampaignSummary, getGeneralBalance } from '@/db/queries/summaries';
import { getCountedLines } from '@/db/queries/ledger';
import { resetDb, seedAdmin, seedGeneral, seedAttachment } from './helpers';

async function donation(campaignId: string, amount: number, published: boolean, adminId: string) {
  const receipt = await seedAttachment();
  await db.transaction(async (tx) => {
    const [t] = await tx.insert(transactions).values({ direction: 'in', amountKurus: amount, occurredAt: '2026-09-10', enteredBy: adminId, receiptAttachmentId: receipt.id, redactionConfirmed: true, published }).returning();
    await tx.insert(allocations).values({ campaignId, amountKurus: amount, reason: 'manual', transactionId: t!.id });
  });
}

describe('summaries', () => {
  beforeEach(resetDb);
  it('counts only published transactions plus transfers', async () => {
    const admin = await seedAdmin();
    const general = await seedGeneral();
    const [kori] = await db.insert(campaigns).values({ slug: 'kori', kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, targetKurus: 1000000, status: 'active' }).returning();
    await donation(kori!.id, 700000, true, admin.id);
    await donation(kori!.id, 500000, false, admin.id); // unpublished, must not count
    const g = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(allocations).values([
        { campaignId: general.id, amountKurus: -100000, reason: 'top_up_from_general', transferGroupId: g },
        { campaignId: kori!.id, amountKurus: 100000, reason: 'top_up_from_general', transferGroupId: g },
      ]);
    });
    expect(await getCountedLines(kori!.id)).toHaveLength(2);
    const s = await getCampaignSummary(kori!);
    expect(s.kind).toBe('one_off');
    if (s.kind === 'one_off') { expect(s.summary.raised).toBe(700000); expect(s.summary.fromGeneral).toBe(100000); expect(s.summary.balance).toBe(800000); }
    expect(await getGeneralBalance()).toBe(-100000);
  });
});
