import { describe, it, expect } from 'vitest';
import { summarizeOneOff, summarizePeriod, summarizeGeneral, deriveOneOffStatus } from '@/lib/ledger/progress';
import type { AllocationLine } from '@/lib/ledger/types';

const l = (amountKurus: number, reason: AllocationLine['reason'], periodId: string | null = null): AllocationLine => ({ campaignId: 'c', periodId, amountKurus, reason });

describe('summarizeOneOff', () => {
  it('computes Kori: raised 12000, paid 10500, moved 1500', () => {
    const s = summarizeOneOff([l(700000, 'note_match'), l(500000, 'manual'), l(-1050000, 'expense'), l(-150000, 'surplus_to_general')], 1050000);
    expect(s).toEqual({ raised: 1200000, fromGeneral: 0, spent: 1050000, movedOut: 150000, balance: 0, targetKurus: 1050000, progress: 1200000 / 1050000, surplus: 150000 });
  });
  it('counts top-ups separately and negative corrections as moved out', () => {
    const s = summarizeOneOff([l(900000, 'note_match'), l(150000, 'top_up_from_general'), l(-20000, 'correction')], 1050000);
    expect(s.raised).toBe(900000); expect(s.fromGeneral).toBe(150000); expect(s.movedOut).toBe(20000); expect(s.balance).toBe(1030000);
  });
  it('null target gives null progress', () => expect(summarizeOneOff([l(100, 'manual')], null).progress).toBeNull());
});

describe('summarizePeriod', () => {
  it('covered month with surplus', () => {
    const s = summarizePeriod([l(280000, 'note_match', 'p'), l(50000, 'carry_forward', 'p'), l(-300000, 'expense', 'p')], 300000);
    expect(s).toEqual({ collected: 280000, carriedIn: 50000, carriedOut: 0, spent: 300000, balance: 30000, targetKurus: 300000, progress: 330000 / 300000, covered: true, surplus: 30000 });
  });
  it('closed month shows carried out', () => {
    const s = summarizePeriod([l(330000, 'note_match', 'p'), l(-300000, 'expense', 'p'), l(-30000, 'carry_forward', 'p')], 300000);
    expect(s.carriedOut).toBe(30000); expect(s.balance).toBe(0);
  });
});

describe('summarizeGeneral', () => {
  it('sums inflow and outflow', () => {
    expect(summarizeGeneral([l(1000, 'manual'), l(500, 'surplus_to_general'), l(-300, 'top_up_from_general'), l(-100, 'expense')]))
      .toEqual({ balance: 1100, inflow: 1500, outflow: 400 });
  });
});

describe('deriveOneOffStatus', () => {
  it('active -> funded when target reached', () => expect(deriveOneOffStatus('active', 1050000, 1050000)).toBe('funded'));
  it('funded -> active when an edit drops below target', () => expect(deriveOneOffStatus('funded', 100, 1050000)).toBe('active'));
  it('completed stays completed', () => expect(deriveOneOffStatus('completed', 0, 1050000)).toBe('completed'));
  it('draft stays draft', () => expect(deriveOneOffStatus('draft', 9999999, 100)).toBe('draft'));
  it('no target never funds', () => expect(deriveOneOffStatus('active', 5, null)).toBe('active'));
});
