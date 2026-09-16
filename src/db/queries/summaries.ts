import { summarizeGeneral, summarizeOneOff, summarizePeriod, type GeneralSummary, type OneOffSummary, type PeriodSummary } from '@/lib/ledger/progress';
import { getCountedLines } from './ledger';
import { getGeneralCampaign, listPeriods, type CampaignRow, type PeriodRow } from './campaigns';

export type CampaignSummary =
  | { kind: 'one_off'; summary: OneOffSummary }
  | { kind: 'recurring'; periods: { period: PeriodRow; summary: PeriodSummary }[] }
  | { kind: 'general'; summary: GeneralSummary };

export async function getCampaignSummary(c: CampaignRow): Promise<CampaignSummary> {
  if (c.kind === 'general') return { kind: 'general', summary: summarizeGeneral(await getCountedLines(c.id)) };
  if (c.kind === 'one_off') return { kind: 'one_off', summary: summarizeOneOff(await getCountedLines(c.id), c.targetKurus) };
  const periods = await listPeriods(c.id);
  const out = [];
  for (const period of periods) out.push({ period, summary: summarizePeriod(await getCountedLines(c.id, period.id), period.targetKurus) });
  return { kind: 'recurring', periods: out };
}

export async function getGeneralBalance(): Promise<number> {
  const g = await getGeneralCampaign();
  return summarizeGeneral(await getCountedLines(g.id)).balance;
}
