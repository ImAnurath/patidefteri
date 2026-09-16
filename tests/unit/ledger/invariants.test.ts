import { describe, it, expect } from 'vitest';
import { validateTransactionLines, validateTransferLines } from '@/lib/ledger/invariants';
import { LedgerError, type CampaignRef, type AllocationLine } from '@/lib/ledger/types';

const refs = new Map<string, CampaignRef>([
  ['g', { id: 'g', kind: 'general', status: 'active', keywords: [] }],
  ['k', { id: 'k', kind: 'one_off', status: 'active', keywords: [] }],
  ['m', { id: 'm', kind: 'recurring', status: 'active', keywords: [] }],
]);
const line = (p: Partial<AllocationLine>): AllocationLine => ({ campaignId: 'k', periodId: null, amountKurus: 100, reason: 'manual', ...p });
const code = (fn: () => void) => { try { fn(); return null; } catch (e) { return e instanceof LedgerError ? e.code : 'OTHER'; } };

describe('validateTransactionLines', () => {
  it('accepts a correct incoming split', () => {
    expect(code(() => validateTransactionLines('in', 300, [line({ amountKurus: 100 }), line({ campaignId: 'g', amountKurus: 200 })], refs))).toBeNull();
  });
  it('rejects empty', () => expect(code(() => validateTransactionLines('in', 100, [], refs))).toBe('LINES_EMPTY'));
  it('rejects sum mismatch', () => expect(code(() => validateTransactionLines('in', 100, [line({ amountKurus: 90 })], refs))).toBe('LINES_SUM_MISMATCH'));
  it('rejects negative line on incoming', () => expect(code(() => validateTransactionLines('in', 100, [line({ amountKurus: 200 }), line({ amountKurus: -100 })], refs))).toBe('LINE_SIGN'));
  it('rejects wrong reason on incoming', () => expect(code(() => validateTransactionLines('in', 100, [line({ reason: 'expense' })], refs))).toBe('LINE_REASON'));
  it('accepts outgoing expense', () => expect(code(() => validateTransactionLines('out', 100, [line({ amountKurus: -100, reason: 'expense' })], refs))).toBeNull());
  it('rejects outgoing with non-expense reason', () => expect(code(() => validateTransactionLines('out', 100, [line({ amountKurus: -100, reason: 'manual' })], refs))).toBe('LINE_REASON'));
  it('requires a period on recurring campaigns', () => expect(code(() => validateTransactionLines('in', 100, [line({ campaignId: 'm' })], refs))).toBe('PERIOD_REQUIRED'));
  it('forbids a period on one-off campaigns', () => expect(code(() => validateTransactionLines('in', 100, [line({ periodId: 'p' })], refs))).toBe('PERIOD_NOT_ALLOWED'));
  it('rejects unknown campaign', () => expect(code(() => validateTransactionLines('in', 100, [line({ campaignId: 'zz' })], refs))).toBe('UNKNOWN_CAMPAIGN'));
});

describe('validateTransferLines', () => {
  const pair = [line({ campaignId: 'k', amountKurus: -500, reason: 'surplus_to_general' }), line({ campaignId: 'g', amountKurus: 500, reason: 'surplus_to_general' })];
  it('accepts a balanced pair', () => expect(code(() => validateTransferLines(pair, refs))).toBeNull());
  it('rejects a single line', () => expect(code(() => validateTransferLines([pair[0]!], refs))).toBe('TRANSFER_TOO_FEW'));
  it('rejects non-zero sum', () => expect(code(() => validateTransferLines([pair[0]!, line({ campaignId: 'g', amountKurus: 400, reason: 'surplus_to_general' })], refs))).toBe('TRANSFER_NOT_ZERO'));
  it('rejects donation reasons', () => expect(code(() => validateTransferLines([line({ amountKurus: -5, reason: 'manual' }), line({ campaignId: 'g', amountKurus: 5, reason: 'manual' })], refs))).toBe('LINE_REASON'));
  it('rejects zero lines', () => expect(code(() => validateTransferLines([line({ amountKurus: 0, reason: 'correction' }), line({ campaignId: 'g', amountKurus: 0, reason: 'correction' })], refs))).toBe('LINE_ZERO'));
});
