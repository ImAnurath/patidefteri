import { LedgerError, type AllocationLine, type AllocationReason } from './types';

export interface TransferArgs {
  fromCampaignId: string; fromPeriodId: string | null;
  toCampaignId: string; toPeriodId: string | null;
  amountKurus: number; reason: AllocationReason;
}

export function makeTransfer(a: TransferArgs): AllocationLine[] {
  if (!Number.isInteger(a.amountKurus) || a.amountKurus <= 0) throw new LedgerError('LINE_ZERO', 'Transfer amount must be a positive integer');
  if (a.fromCampaignId === a.toCampaignId && a.fromPeriodId === a.toPeriodId) throw new LedgerError('TRANSFER_SAME_TARGET', 'Transfer source and target are the same');
  return [
    { campaignId: a.fromCampaignId, periodId: a.fromPeriodId, amountKurus: -a.amountKurus, reason: a.reason },
    { campaignId: a.toCampaignId, periodId: a.toPeriodId, amountKurus: a.amountKurus, reason: a.reason },
  ];
}
