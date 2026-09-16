import { describe, it, expect } from 'vitest';
import { matchCampaigns, splitEvenly, pickPeriod, suggestAllocations } from '@/lib/ledger/suggest';
import type { CampaignRef, PeriodRef } from '@/lib/ledger/types';

const general: CampaignRef = { id: 'g', kind: 'general', status: 'active', keywords: [] };
const kori: CampaignRef = { id: 'k', kind: 'one_off', status: 'active', keywords: ['kori'] };
const mama: CampaignRef = { id: 'm', kind: 'recurring', status: 'active', keywords: ['mama', 'yemek'] };
const old: CampaignRef = { id: 'o', kind: 'one_off', status: 'completed', keywords: ['boncuk'] };
const all = [general, kori, mama, old];
const periods: PeriodRef[] = [
  { id: 'p9', campaignId: 'm', periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 300000, closedAt: null },
  { id: 'p10', campaignId: 'm', periodStart: '2026-10-01', periodEnd: '2026-10-31', targetKurus: 300000, closedAt: null },
];

describe('matchCampaigns', () => {
  it('matches a keyword regardless of case and suffix', () => expect(matchCampaigns("KORİ'ye", all).map((c) => c.id)).toEqual(['k']));
  it('matches several', () => expect(matchCampaigns('kori ve mama', all).map((c) => c.id)).toEqual(['k', 'm']));
  it('ignores completed campaigns', () => expect(matchCampaigns('boncuk', all)).toEqual([]));
  it('never matches general', () => expect(matchCampaigns('genel', all)).toEqual([]));
  it('does not prefix-match short keywords into unrelated words', () => {
    const c: CampaignRef = { id: 'x', kind: 'one_off', status: 'active', keywords: ['ay'] };
    expect(matchCampaigns('ayşe', [c])).toEqual([]);
  });
});

describe('splitEvenly', () => {
  it('gives the remainder to the first', () => expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]));
  it('single', () => expect(splitEvenly(5, 1)).toEqual([5]));
});

describe('pickPeriod', () => {
  it('uses the period containing the date', () => expect(pickPeriod('m', periods, '2026-09-16', null)).toBe('p9'));
  it('uses the mentioned month', () => expect(pickPeriod('m', periods, '2026-09-16', 10)).toBe('p10'));
  it('null when no period', () => expect(pickPeriod('m', periods, '2026-12-01', null)).toBeNull());
  it('month mention earlier than the occurrence month resolves to next year', () => {
    const janPeriods: PeriodRef[] = [
      { id: 'jan26', campaignId: 'm', periodStart: '2026-01-01', periodEnd: '2026-01-31', targetKurus: 300000, closedAt: null },
      { id: 'jan27', campaignId: 'm', periodStart: '2027-01-01', periodEnd: '2027-01-31', targetKurus: 300000, closedAt: null },
    ];
    expect(pickPeriod('m', janPeriods, '2026-09-16', 1)).toBe('jan27');
  });
  it('does not pick a closed period', () => {
    const closedPeriods: PeriodRef[] = [
      { id: 'closed', campaignId: 'm', periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 300000, closedAt: new Date('2026-09-10') },
    ];
    expect(pickPeriod('m', closedPeriods, '2026-09-16', null)).toBeNull();
  });
});

describe('suggestAllocations', () => {
  const base = { amountKurus: 100000, occurredAt: '2026-09-16', campaigns: all, periods, generalId: 'g' };
  it('no note goes to general', () => {
    expect(suggestAllocations({ ...base, note: null }).lines).toEqual([{ campaignId: 'g', periodId: null, amountKurus: 100000, reason: 'manual' }]);
  });
  it('single match', () => {
    expect(suggestAllocations({ ...base, note: 'Kori' }).lines).toEqual([{ campaignId: 'k', periodId: null, amountKurus: 100000, reason: 'note_match' }]);
  });
  it('multi match splits evenly and picks the period for recurring', () => {
    expect(suggestAllocations({ ...base, note: 'kori ve mama', amountKurus: 100001 }).lines).toEqual([
      { campaignId: 'k', periodId: null, amountKurus: 50001, reason: 'note_match' },
      { campaignId: 'm', periodId: 'p9', amountKurus: 50000, reason: 'note_match' },
    ]);
  });
  it('month mention selects the future period', () => {
    expect(suggestAllocations({ ...base, note: 'mama ekim' }).lines[0]?.periodId).toBe('p10');
  });
});
