import { describe, it, expect } from 'vitest';
import { planCompletion } from '@/lib/ledger/completion';
import type { AllocationLine, CampaignRef } from '@/lib/ledger/types';

const kori: CampaignRef = { id: 'k', kind: 'one_off', status: 'funded', keywords: ['kori'] };
const l = (amountKurus: number, reason: AllocationLine['reason']): AllocationLine => ({ campaignId: 'k', periodId: null, amountKurus, reason });
const base = { campaign: kori, generalId: 'g', generalBalance: 500000 };

describe('planCompletion', () => {
  it('blocks without an expense', () => {
    const p = planCompletion({ ...base, lines: [l(1200000, 'note_match')] });
    expect(p.canComplete).toBe(false); expect(p.blocker).toBe('NO_EXPENSE'); expect(p.suggestedTransfer).toBeNull();
  });
  it('suggests moving surplus to general', () => {
    const p = planCompletion({ ...base, lines: [l(1200000, 'note_match'), l(-1050000, 'expense')] });
    expect(p.blocker).toBe('BALANCE_POSITIVE');
    expect(p.suggestedTransfer).toEqual([
      { campaignId: 'k', periodId: null, amountKurus: -150000, reason: 'surplus_to_general' },
      { campaignId: 'g', periodId: null, amountKurus: 150000, reason: 'surplus_to_general' },
    ]);
  });
  it('suggests a top-up when short and general can cover', () => {
    const p = planCompletion({ ...base, lines: [l(900000, 'note_match'), l(-1050000, 'expense')] });
    expect(p.blocker).toBe('BALANCE_NEGATIVE');
    expect(p.suggestedTransfer).toEqual([
      { campaignId: 'g', periodId: null, amountKurus: -150000, reason: 'top_up_from_general' },
      { campaignId: 'k', periodId: null, amountKurus: 150000, reason: 'top_up_from_general' },
    ]);
  });
  it('blocks when general cannot cover', () => {
    const p = planCompletion({ ...base, generalBalance: 1000, lines: [l(900000, 'note_match'), l(-1050000, 'expense')] });
    expect(p.blocker).toBe('GENERAL_INSUFFICIENT'); expect(p.suggestedTransfer).toBeNull();
  });
  it('completes at zero with an expense', () => {
    const p = planCompletion({ ...base, lines: [l(1200000, 'note_match'), l(-1050000, 'expense'), l(-150000, 'surplus_to_general')] });
    expect(p).toEqual({ canComplete: true, balance: 0, hasExpense: true, blocker: null, suggestedTransfer: null });
  });
  it('rejects wrong status', () => {
    expect(planCompletion({ ...base, campaign: { ...kori, status: 'completed' }, lines: [] }).blocker).toBe('WRONG_STATUS');
  });
});
