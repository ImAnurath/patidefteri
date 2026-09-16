import { LedgerError, type AllocationLine, type PeriodRef } from './types';
import { makeTransfer } from './transfers';

const pad = (n: number) => String(n).padStart(2, '0');

export function monthPeriodFor(dateIso: string): { periodStart: string; periodEnd: string } {
  const year = Number(dateIso.slice(0, 4));
  const month = Number(dateIso.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { periodStart: `${year}-${pad(month)}-01`, periodEnd: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function nextMonthPeriod(periodStart: string): { periodStart: string; periodEnd: string } {
  const year = Number(periodStart.slice(0, 4));
  const month = Number(periodStart.slice(5, 7));
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return monthPeriodFor(`${next.y}-${pad(next.m)}-01`);
}

export function periodContaining(periods: readonly PeriodRef[], dateIso: string): PeriodRef | undefined {
  return periods.find((p) => p.periodStart <= dateIso && dateIso <= p.periodEnd);
}

/** Lines that move a period's positive balance into the next period. Null when there is nothing to carry. */
export function planCarryForward(period: PeriodRef, nextPeriodId: string, balance: number): AllocationLine[] | null {
  if (period.closedAt) throw new LedgerError('PERIOD_CLOSED', `Period ${period.id} is already closed`);
  if (balance <= 0) return null;
  return makeTransfer({
    fromCampaignId: period.campaignId, fromPeriodId: period.id,
    toCampaignId: period.campaignId, toPeriodId: nextPeriodId,
    amountKurus: balance, reason: 'carry_forward',
  });
}
