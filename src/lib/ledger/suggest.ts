import { tokenize, findMonthMention, normalizeText } from './normalize';
import type { AllocationLine, CampaignRef, PeriodRef } from './types';

const MATCHABLE_STATUSES = new Set(['active', 'funded']);
const MIN_PREFIX_KEYWORD_LENGTH = 4;

export function matchCampaigns(note: string, campaigns: CampaignRef[]): CampaignRef[] {
  const tokens = tokenize(note);
  if (tokens.length === 0) return [];
  return campaigns.filter((c) => {
    if (c.kind === 'general' || !MATCHABLE_STATUSES.has(c.status)) return false;
    return c.keywords.some((kw) => {
      const k = normalizeText(kw);
      if (k === '') return false;
      return tokens.some((tok) => tok === k || (k.length >= MIN_PREFIX_KEYWORD_LENGTH && tok.startsWith(k)));
    });
  });
}

export function splitEvenly(amountKurus: number, n: number): number[] {
  const base = Math.floor(amountKurus / n);
  const remainder = amountKurus - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + remainder : base));
}

export function pickPeriod(campaignId: string, periods: PeriodRef[], occurredAt: string, monthMention: number | null): string | null {
  const own = periods.filter((p) => p.campaignId === campaignId);
  if (monthMention !== null) {
    const year = Number(occurredAt.slice(0, 4));
    const mm = String(monthMention).padStart(2, '0');
    const hit = own.find((p) => p.periodStart === `${year}-${mm}-01`) ?? own.find((p) => p.periodStart === `${year + 1}-${mm}-01`);
    if (hit) return hit.id;
  }
  const containing = own.find((p) => p.periodStart <= occurredAt && occurredAt <= p.periodEnd);
  return containing ? containing.id : null;
}

export interface SuggestInput {
  note: string | null;
  amountKurus: number;
  occurredAt: string;
  campaigns: CampaignRef[];
  periods: PeriodRef[];
  generalId: string;
}
export interface Suggestion {
  lines: AllocationLine[];
  matchedCampaignIds: string[];
}

export function suggestAllocations(input: SuggestInput): Suggestion {
  const note = input.note ?? '';
  const matched = matchCampaigns(note, input.campaigns);
  if (matched.length === 0) {
    return { lines: [{ campaignId: input.generalId, periodId: null, amountKurus: input.amountKurus, reason: 'manual' }], matchedCampaignIds: [] };
  }
  const monthMention = findMonthMention(tokenize(note));
  const parts = splitEvenly(input.amountKurus, matched.length);
  const lines: AllocationLine[] = matched.map((c, i) => ({
    campaignId: c.id,
    periodId: c.kind === 'recurring' ? pickPeriod(c.id, input.periods, input.occurredAt, monthMention) : null,
    amountKurus: parts[i]!,
    reason: 'note_match',
  }));
  return { lines, matchedCampaignIds: matched.map((c) => c.id) };
}
