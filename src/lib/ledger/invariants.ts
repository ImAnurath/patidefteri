import { DONATION_REASONS, LedgerError, TRANSFER_REASONS, type AllocationLine, type CampaignRef, type TxDirection } from './types';

export function sumLines(lines: readonly AllocationLine[]): number {
  return lines.reduce((acc, l) => acc + l.amountKurus, 0);
}

function checkPeriodRule(line: AllocationLine, campaigns: Map<string, CampaignRef>): void {
  const c = campaigns.get(line.campaignId);
  if (!c) throw new LedgerError('UNKNOWN_CAMPAIGN', `Unknown campaign ${line.campaignId}`);
  if (c.kind === 'recurring' && !line.periodId) throw new LedgerError('PERIOD_REQUIRED', `Campaign ${c.id} is recurring and needs a period`);
  if (c.kind !== 'recurring' && line.periodId) throw new LedgerError('PERIOD_NOT_ALLOWED', `Campaign ${c.id} is not recurring`);
}

export function validateTransactionLines(
  direction: TxDirection,
  amountKurus: number,
  lines: readonly AllocationLine[],
  campaigns: Map<string, CampaignRef>,
): void {
  if (lines.length === 0) throw new LedgerError('LINES_EMPTY', 'At least one allocation line is required');
  for (const l of lines) {
    if (l.amountKurus === 0) throw new LedgerError('LINE_ZERO', 'Allocation amount cannot be zero');
    if (direction === 'in') {
      if (l.amountKurus < 0) throw new LedgerError('LINE_SIGN', 'Incoming transaction lines must be positive');
      if (!DONATION_REASONS.includes(l.reason)) throw new LedgerError('LINE_REASON', `Reason ${l.reason} not allowed on incoming transaction`);
    } else {
      if (l.amountKurus > 0) throw new LedgerError('LINE_SIGN', 'Outgoing transaction lines must be negative');
      if (l.reason !== 'expense') throw new LedgerError('LINE_REASON', 'Outgoing transaction lines must have reason expense');
    }
    checkPeriodRule(l, campaigns);
  }
  const expected = direction === 'in' ? amountKurus : -amountKurus;
  const sum = sumLines(lines);
  if (sum !== expected) throw new LedgerError('LINES_SUM_MISMATCH', `Lines sum to ${sum}, expected ${expected}`);
}

export function validateTransferLines(lines: readonly AllocationLine[], campaigns: Map<string, CampaignRef>): void {
  if (lines.length < 2) throw new LedgerError('TRANSFER_TOO_FEW', 'A transfer needs at least two lines');
  for (const l of lines) {
    if (l.amountKurus === 0) throw new LedgerError('LINE_ZERO', 'Transfer line cannot be zero');
    if (!TRANSFER_REASONS.includes(l.reason)) throw new LedgerError('LINE_REASON', `Reason ${l.reason} not allowed on a transfer`);
    checkPeriodRule(l, campaigns);
  }
  const sum = sumLines(lines);
  if (sum !== 0) throw new LedgerError('TRANSFER_NOT_ZERO', `Transfer lines sum to ${sum}, expected 0`);
}
