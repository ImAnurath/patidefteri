import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { allocations, campaigns, transactions } from '@/db/schema';
import { resetDb, rethrowCause, seedAdmin, seedGeneral, seedAttachment } from './helpers';

describe('schema constraints', () => {
  beforeEach(resetDb);

  it('allows only one general campaign', async () => {
    await seedGeneral();
    await expect(db.insert(campaigns).values({ slug: 'genel-2', kind: 'general', title: { tr: 'x' }, description: { tr: 'x' } }).catch(rethrowCause))
      .rejects.toThrow(/campaigns_single_general/);
  });

  it('refuses to publish a transaction without a redacted receipt', async () => {
    const admin = await seedAdmin();
    await expect(db.insert(transactions).values({ direction: 'in', amountKurus: 100, occurredAt: '2026-09-01', published: true, enteredBy: admin.id }).catch(rethrowCause))
      .rejects.toThrow(/transactions_publish_requires_redacted_receipt/);
  });

  it('requires an allocation to have exactly one source', async () => {
    const general = await seedGeneral();
    await expect(db.insert(allocations).values({ campaignId: general.id, amountKurus: 100, reason: 'manual' }).catch(rethrowCause))
      .rejects.toThrow(/allocations_source_xor/);
  });

  it('rejects, at commit, a transaction whose lines do not sum to its amount', async () => {
    const general = await seedGeneral();
    const admin = await seedAdmin();
    await expect(db.transaction(async (tx) => {
      const [t] = await tx.insert(transactions).values({ direction: 'in', amountKurus: 1000, occurredAt: '2026-09-01', enteredBy: admin.id }).returning();
      await tx.insert(allocations).values({ campaignId: general.id, amountKurus: 900, reason: 'manual', transactionId: t!.id });
    }).catch(rethrowCause)).rejects.toThrow(/does not match/);
  });

  it('accepts a transaction whose lines sum correctly', async () => {
    const general = await seedGeneral();
    const admin = await seedAdmin();
    const receipt = await seedAttachment();
    await db.transaction(async (tx) => {
      const [t] = await tx.insert(transactions).values({
        direction: 'in', amountKurus: 1000, occurredAt: '2026-09-01', enteredBy: admin.id,
        receiptAttachmentId: receipt.id, redactionConfirmed: true, published: true,
      }).returning();
      await tx.insert(allocations).values({ campaignId: general.id, amountKurus: 1000, reason: 'manual', transactionId: t!.id });
    });
    expect(await db.select().from(allocations)).toHaveLength(1);
  });

  it('rejects a transfer group that does not net to zero', async () => {
    const general = await seedGeneral();
    const [other] = await db.insert(campaigns).values({ slug: 'kori', kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, targetKurus: 5000 }).returning();
    const g = crypto.randomUUID();
    await expect(db.transaction(async (tx) => {
      await tx.insert(allocations).values([
        { campaignId: general.id, amountKurus: -500, reason: 'top_up_from_general', transferGroupId: g },
        { campaignId: other!.id, amountKurus: 400, reason: 'top_up_from_general', transferGroupId: g },
      ]);
    }).catch(rethrowCause)).rejects.toThrow(/does not net to zero/);
  });

  it('rejects publishing a transaction that has no lines', async () => {
    const admin = await seedAdmin();
    const receipt = await seedAttachment();
    const [t] = await db.insert(transactions).values({ direction: 'in', amountKurus: 1000, occurredAt: '2026-09-01', enteredBy: admin.id, receiptAttachmentId: receipt.id, redactionConfirmed: true }).returning();
    await expect(db.update(transactions).set({ published: true }).where(eq(transactions.id, t!.id)).catch(rethrowCause)).rejects.toThrow(/has no allocations/);
  });
});
