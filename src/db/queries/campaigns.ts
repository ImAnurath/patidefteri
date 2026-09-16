import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, type Tx } from '@/db/client';
import { campaigns, campaignPeriods } from '@/db/schema';
import { monthPeriodFor } from '@/lib/ledger/periods';
import type { CampaignKind, CampaignRef, CampaignStatus, PeriodRef } from '@/lib/ledger/types';

export type CampaignRow = typeof campaigns.$inferSelect;
export type PeriodRow = typeof campaignPeriods.$inferSelect;

export const toCampaignRef = (c: CampaignRow): CampaignRef => ({ id: c.id, kind: c.kind, status: c.status, keywords: c.keywords });
export const toPeriodRef = (p: PeriodRow): PeriodRef => ({ id: p.id, campaignId: p.campaignId, periodStart: p.periodStart, periodEnd: p.periodEnd, targetKurus: p.targetKurus, closedAt: p.closedAt });

/** Accepts an executor so callers inside a transaction can pass their `tx`. */
export async function getGeneralCampaign(exec: Tx | typeof db = db): Promise<CampaignRow> {
  const [g] = await exec.select().from(campaigns).where(eq(campaigns.kind, 'general')).limit(1);
  if (!g) throw new Error('General campaign missing. Run npm run db:seed.');
  return g;
}

export async function listCampaigns(opts: { statuses?: CampaignStatus[]; kinds?: CampaignKind[] } = {}): Promise<CampaignRow[]> {
  const conds = [];
  if (opts.statuses?.length) conds.push(inArray(campaigns.status, opts.statuses));
  if (opts.kinds?.length) conds.push(inArray(campaigns.kind, opts.kinds));
  return db.select().from(campaigns).where(conds.length ? and(...conds) : undefined).orderBy(asc(campaigns.createdAt));
}

export async function getCampaignBySlug(slug: string): Promise<CampaignRow | null> {
  const [c] = await db.select().from(campaigns).where(eq(campaigns.slug, slug)).limit(1);
  return c ?? null;
}
export async function getCampaignById(id: string): Promise<CampaignRow | null> {
  const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return c ?? null;
}

export async function listPeriods(campaignId: string): Promise<PeriodRow[]> {
  return db.select().from(campaignPeriods).where(eq(campaignPeriods.campaignId, campaignId)).orderBy(asc(campaignPeriods.periodStart));
}
export async function getPeriodById(id: string): Promise<PeriodRow | null> {
  const [p] = await db.select().from(campaignPeriods).where(eq(campaignPeriods.id, id)).limit(1);
  return p ?? null;
}

/** Returns the period containing dateIso, creating it (with the given target) if missing. */
export async function ensurePeriod(tx: Tx, campaignId: string, dateIso: string, targetKurus: number): Promise<PeriodRow> {
  const { periodStart, periodEnd } = monthPeriodFor(dateIso);
  const [existing] = await tx.select().from(campaignPeriods)
    .where(and(eq(campaignPeriods.campaignId, campaignId), eq(campaignPeriods.periodStart, periodStart))).limit(1);
  if (existing) return existing;
  const [created] = await tx.insert(campaignPeriods).values({ campaignId, periodStart, periodEnd, targetKurus }).returning();
  return created!;
}

export async function campaignRefMap(): Promise<Map<string, CampaignRef>> {
  const rows = await db.select().from(campaigns);
  return new Map(rows.map((r) => [r.id, toCampaignRef(r)]));
}
