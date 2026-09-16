import { and, eq, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { campaigns, campaignPeriods, vetQuotes } from '@/db/schema';
import { pickUniqueSlug, slugify } from '@/lib/slug';
import { normalizeText } from '@/lib/ledger/normalize';
import { writeAudit } from '@/lib/audit';
import type { Localized } from '@/lib/i18n/localized';
import type { CampaignKind, CampaignStatus } from '@/lib/ledger/types';
import type { CampaignRow, PeriodRow } from '@/db/queries/campaigns';

export interface CampaignInput {
  kind: CampaignKind; title: Localized; description: Localized; keywords: string[]; targetKurus: number | null; animalId: string | null;
}

export async function createCampaign(input: CampaignInput, actorId: string): Promise<CampaignRow> {
  return db.transaction(async (tx) => {
    const root = slugify(input.title.tr) || 'kayit';
    const taken = (await tx.select({ slug: campaigns.slug }).from(campaigns).where(like(campaigns.slug, `${root}%`))).map((r) => r.slug);
    const [row] = await tx.insert(campaigns).values({
      slug: pickUniqueSlug(input.title.tr, taken), kind: input.kind, title: input.title, description: input.description, animalId: input.animalId,
      keywords: [...new Set(input.keywords.map(normalizeText).filter(Boolean))],
      targetKurus: input.kind === 'general' ? null : input.targetKurus,
    }).returning();
    await writeAudit(tx, { actorId, action: 'campaign.create', entity: 'campaigns', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export async function updateCampaign(id: string, input: Omit<CampaignInput, 'kind'>, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!before) throw new Error('Kampanya bulunamadı');
    const [after] = await tx.update(campaigns).set({
      title: input.title, description: input.description, animalId: input.animalId,
      keywords: [...new Set(input.keywords.map(normalizeText).filter(Boolean))],
      targetKurus: before.kind === 'general' ? null : input.targetKurus, updatedAt: new Date(),
    }).where(eq(campaigns.id, id)).returning();
    await writeAudit(tx, { actorId, action: 'campaign.update', entity: 'campaigns', entityId: id, diff: { before, after } });
  });
}

export async function setCampaignStatus(id: string, status: CampaignStatus, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!before) throw new Error('Kampanya bulunamadı');
    if (status === 'completed') throw new Error('Tamamlama işlemi kampanya sayfasındaki "Tamamla" ile yapılır');
    await tx.update(campaigns).set({
      status, updatedAt: new Date(),
      openedAt: status === 'active' && !before.openedAt ? new Date() : before.openedAt,
      closedAt: status === 'cancelled' ? new Date() : null,
    }).where(eq(campaigns.id, id));
    await writeAudit(tx, { actorId, action: 'campaign.status', entity: 'campaigns', entityId: id, diff: { from: before.status, to: status } });
  });
}

export async function addPeriod(campaignId: string, periodStart: string, periodEnd: string, targetKurus: number, actorId: string): Promise<PeriodRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(campaignPeriods).values({ campaignId, periodStart, periodEnd, targetKurus }).returning();
    await writeAudit(tx, { actorId, action: 'period.create', entity: 'campaign_periods', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export async function acceptQuote(quoteId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [q] = await tx.select().from(vetQuotes).where(eq(vetQuotes.id, quoteId)).limit(1);
    if (!q) throw new Error('Teklif bulunamadı');
    await tx.update(vetQuotes).set({ status: 'offered', updatedAt: new Date() })
      .where(and(eq(vetQuotes.campaignId, q.campaignId), eq(vetQuotes.status, 'accepted')));
    await tx.update(vetQuotes).set({ status: 'accepted', updatedAt: new Date() }).where(eq(vetQuotes.id, quoteId));
    await tx.update(campaigns).set({ targetKurus: q.amountKurus, acceptedQuoteId: quoteId, updatedAt: new Date() }).where(eq(campaigns.id, q.campaignId));
    await writeAudit(tx, { actorId, action: 'quote.accept', entity: 'vet_quotes', entityId: quoteId, diff: { campaignId: q.campaignId, targetKurus: q.amountKurus } });
  });
}
