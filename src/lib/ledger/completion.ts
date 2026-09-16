import { sumLines } from './invariants';
import { makeTransfer } from './transfers';
import type { AllocationLine, CampaignRef } from './types';

export type CompletionBlocker = 'NO_EXPENSE' | 'BALANCE_POSITIVE' | 'BALANCE_NEGATIVE' | 'GENERAL_INSUFFICIENT' | 'WRONG_STATUS';

export interface CompletionPlan {
  canComplete: boolean;
  balance: number;
  hasExpense: boolean;
  blocker: CompletionBlocker | null;
  suggestedTransfer: AllocationLine[] | null;
}

export interface CompletionInput {
  campaign: CampaignRef;
  lines: readonly AllocationLine[];
  generalId: string;
  generalBalance: number;
}

export function planCompletion({ campaign, lines, generalId, generalBalance }: CompletionInput): CompletionPlan {
  const balance = sumLines(lines);
  const hasExpense = lines.some((l) => l.reason === 'expense');
  const fail = (blocker: CompletionBlocker, suggestedTransfer: AllocationLine[] | null = null): CompletionPlan =>
    ({ canComplete: false, balance, hasExpense, blocker, suggestedTransfer });

  if (campaign.status !== 'active' && campaign.status !== 'funded') return fail('WRONG_STATUS');
  if (!hasExpense) return fail('NO_EXPENSE');
  if (balance > 0) {
    return fail('BALANCE_POSITIVE', makeTransfer({
      fromCampaignId: campaign.id, fromPeriodId: null, toCampaignId: generalId, toPeriodId: null,
      amountKurus: balance, reason: 'surplus_to_general',
    }));
  }
  if (balance < 0) {
    const need = -balance;
    if (generalBalance < need) return fail('GENERAL_INSUFFICIENT');
    return fail('BALANCE_NEGATIVE', makeTransfer({
      fromCampaignId: generalId, fromPeriodId: null, toCampaignId: campaign.id, toPeriodId: null,
      amountKurus: need, reason: 'top_up_from_general',
    }));
  }
  return { canComplete: true, balance, hasExpense, blocker: null, suggestedTransfer: null };
}
