import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { vetPartners, vetQuotes, campaigns } from '@/db/schema';
export type VetRow = typeof vetPartners.$inferSelect;
export type QuoteRow = typeof vetQuotes.$inferSelect;

export const listVets = (onlyActive = true) =>
  db.select().from(vetPartners).where(onlyActive ? eq(vetPartners.active, true) : undefined).orderBy(asc(vetPartners.clinicName));
export async function getVetById(id: string): Promise<VetRow | null> {
  const [v] = await db.select().from(vetPartners).where(eq(vetPartners.id, id)).limit(1);
  return v ?? null;
}
export const listQuotesForCampaign = (campaignId: string) =>
  db.select({ quote: vetQuotes, vet: vetPartners }).from(vetQuotes)
    .innerJoin(vetPartners, eq(vetQuotes.vetId, vetPartners.id))
    .where(eq(vetQuotes.campaignId, campaignId)).orderBy(desc(vetQuotes.quotedAt));
export const listQuotesForVet = (vetId: string) =>
  db.select({ quote: vetQuotes, campaign: campaigns }).from(vetQuotes)
    .innerJoin(campaigns, eq(vetQuotes.campaignId, campaigns.id))
    .where(eq(vetQuotes.vetId, vetId)).orderBy(desc(vetQuotes.quotedAt));
