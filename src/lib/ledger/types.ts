import type { ALLOCATION_REASONS, CAMPAIGN_KINDS, CAMPAIGN_STATUSES, TX_DIRECTIONS } from '@/db/schema/enums';

export type AllocationReason = (typeof ALLOCATION_REASONS)[number];
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type TxDirection = (typeof TX_DIRECTIONS)[number];

export interface CampaignRef {
  id: string;
  kind: CampaignKind;
  status: CampaignStatus;
  keywords: string[];
}

export interface PeriodRef {
  id: string;
  campaignId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  targetKurus: number;
  closedAt: Date | null;
}

export interface AllocationLine {
  campaignId: string;
  periodId: string | null;
  amountKurus: number; // signed
  reason: AllocationReason;
}

export interface LedgerLine extends AllocationLine {
  id: string;
  transactionId: string | null;
  transferGroupId: string | null;
  note: string | null;
  createdAt: Date;
}

export type LedgerErrorCode =
  | 'LINES_EMPTY' | 'LINES_SUM_MISMATCH' | 'LINE_SIGN' | 'LINE_REASON' | 'LINE_ZERO'
  | 'TRANSFER_TOO_FEW' | 'TRANSFER_NOT_ZERO' | 'TRANSFER_SAME_TARGET'
  | 'PERIOD_REQUIRED' | 'PERIOD_NOT_ALLOWED' | 'PERIOD_CLOSED'
  | 'NO_EXPENSE' | 'BALANCE_NOT_ZERO' | 'GENERAL_INSUFFICIENT' | 'WRONG_STATUS' | 'UNKNOWN_CAMPAIGN';

export class LedgerError extends Error {
  constructor(public readonly code: LedgerErrorCode, message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export const DONATION_REASONS: readonly AllocationReason[] = ['note_match', 'manual', 'correction'];
export const TRANSFER_REASONS: readonly AllocationReason[] = ['carry_forward', 'surplus_to_general', 'top_up_from_general', 'correction'];
