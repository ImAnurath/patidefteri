import { describe, it, expect } from 'vitest';
import { monthPeriodFor, nextMonthPeriod, periodContaining, planCarryForward } from '@/lib/ledger/periods';
import { makeTransfer } from '@/lib/ledger/transfers';
import type { PeriodRef } from '@/lib/ledger/types';

describe('monthPeriodFor', () => {
  it('september', () => expect(monthPeriodFor('2026-09-16')).toEqual({ periodStart: '2026-09-01', periodEnd: '2026-09-30' }));
  it('february leap', () => expect(monthPeriodFor('2028-02-10')).toEqual({ periodStart: '2028-02-01', periodEnd: '2028-02-29' }));
});
describe('nextMonthPeriod', () => {
  it('rolls the year', () => expect(nextMonthPeriod('2026-12-01')).toEqual({ periodStart: '2027-01-01', periodEnd: '2027-01-31' }));
});
describe('periodContaining', () => {
  const p: PeriodRef = { id: 'p', campaignId: 'm', periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 1, closedAt: null };
  it('finds', () => expect(periodContaining([p], '2026-09-30')?.id).toBe('p'));
  it('misses', () => expect(periodContaining([p], '2026-10-01')).toBeUndefined());
});
describe('makeTransfer', () => {
  it('produces a balanced pair', () => {
    expect(makeTransfer({ fromCampaignId: 'k', fromPeriodId: null, toCampaignId: 'g', toPeriodId: null, amountKurus: 1500, reason: 'surplus_to_general' })).toEqual([
      { campaignId: 'k', periodId: null, amountKurus: -1500, reason: 'surplus_to_general' },
      { campaignId: 'g', periodId: null, amountKurus: 1500, reason: 'surplus_to_general' },
    ]);
  });
  it('rejects non-positive amounts', () => expect(() => makeTransfer({ fromCampaignId: 'k', fromPeriodId: null, toCampaignId: 'g', toPeriodId: null, amountKurus: 0, reason: 'correction' })).toThrow());
});
describe('planCarryForward', () => {
  const p: PeriodRef = { id: 'p9', campaignId: 'm', periodStart: '2026-09-01', periodEnd: '2026-09-30', targetKurus: 300000, closedAt: null };
  it('carries a positive balance', () => {
    expect(planCarryForward(p, 'p10', 30000)).toEqual([
      { campaignId: 'm', periodId: 'p9', amountKurus: -30000, reason: 'carry_forward' },
      { campaignId: 'm', periodId: 'p10', amountKurus: 30000, reason: 'carry_forward' },
    ]);
  });
  it('nothing to carry', () => expect(planCarryForward(p, 'p10', 0)).toBeNull());
  it('refuses a closed period', () => expect(() => planCarryForward({ ...p, closedAt: new Date() }, 'p10', 5)).toThrow(/closed/));
});
