import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { auditLog, campaigns, vetPartners, vetQuotes } from '@/db/schema';
import { createCampaign, acceptQuote } from '@/db/mutations/campaigns';
import { resetDb, seedAdmin, seedGeneral } from './helpers';

describe('campaign mutations', () => {
  beforeEach(resetDb);
  it('creates a one-off campaign with normalized keywords and audit', async () => {
    const admin = await seedAdmin();
    const c = await createCampaign({ kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, keywords: ['Kori'], targetKurus: 1000, animalId: null }, admin.id);
    expect(c.slug).toBe('kori');
    expect(c.keywords).toEqual(['kori']);
    expect(c.status).toBe('draft');
    expect((await db.select().from(auditLog)).map((a) => a.action)).toEqual(['campaign.create']);
  });
  it('makes the slug unique', async () => {
    const admin = await seedAdmin();
    await createCampaign({ kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, keywords: [], targetKurus: null, animalId: null }, admin.id);
    const second = await createCampaign({ kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, keywords: [], targetKurus: null, animalId: null }, admin.id);
    expect(second.slug).toBe('kori-2');
  });
  it('refuses to create a second general campaign', async () => {
    const admin = await seedAdmin();
    await seedGeneral();
    await expect(createCampaign({ kind: 'general', title: { tr: 'G' }, description: { tr: 'x' }, keywords: [], targetKurus: null, animalId: null }, admin.id)).rejects.toThrow();
  });
  it('accepting a quote sets target and demotes the previous accepted quote', async () => {
    const admin = await seedAdmin();
    const c = await createCampaign({ kind: 'one_off', title: { tr: 'Kori' }, description: { tr: 'x' }, keywords: [], targetKurus: null, animalId: null }, admin.id);
    const [vet] = await db.insert(vetPartners).values({ name: 'V', clinicName: 'C', phone: '1', address: 'A' }).returning();
    const [q1] = await db.insert(vetQuotes).values({ vetId: vet!.id, campaignId: c.id, service: { tr: 's' }, amountKurus: 900, quotedAt: '2026-09-01' }).returning();
    const [q2] = await db.insert(vetQuotes).values({ vetId: vet!.id, campaignId: c.id, service: { tr: 's' }, amountKurus: 1100, quotedAt: '2026-09-02' }).returning();
    await acceptQuote(q1!.id, admin.id);
    await acceptQuote(q2!.id, admin.id);
    const [after] = await db.select().from(campaigns);
    expect(after!.targetKurus).toBe(1100);
    expect(after!.acceptedQuoteId).toBe(q2!.id);
    const quotes = await db.select().from(vetQuotes);
    expect(quotes.find((q) => q.id === q1!.id)!.status).toBe('offered');
    expect(quotes.find((q) => q.id === q2!.id)!.status).toBe('accepted');
  });
});
