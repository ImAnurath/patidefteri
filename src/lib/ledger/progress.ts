import { sumLines } from './invariants';
import type { AllocationLine, CampaignStatus } from './types';

const sumWhere = (lines: readonly AllocationLine[], pred: (l: AllocationLine) => boolean) => sumLines(lines.filter(pred));

export interface OneOffSummary {
  raised: number; fromGeneral: number; spent: number; movedOut: number; balance: number;
  targetKurus: number | null; progress: number | null; surplus: number;
}

export function summarizeOneOff(lines: readonly AllocationLine[], targetKurus: number | null): OneOffSummary {
  const raised = sumWhere(lines, (l) => l.amountKurus > 0 && (l.reason === 'note_match' || l.reason === 'manual' || l.reason === 'correction'));
  const fromGeneral = sumWhere(lines, (l) => l.reason === 'top_up_from_general' && l.amountKurus > 0);
  const spent = 0 - sumWhere(lines, (l) => l.reason === 'expense');
  const movedOut = 0 - sumWhere(lines, (l) => l.amountKurus < 0 && (l.reason === 'surplus_to_general' || l.reason === 'correction'));
  const balance = sumLines(lines);
  const progress = targetKurus ? raised / targetKurus : null;
  const surplus = targetKurus ? Math.max(0, raised - targetKurus) : 0;
  return { raised, fromGeneral, spent, movedOut, balance, targetKurus, progress, surplus };
}

export interface PeriodSummary {
  collected: number; carriedIn: number; carriedOut: number; spent: number; balance: number;
  targetKurus: number; progress: number; covered: boolean; surplus: number;
}

export function summarizePeriod(lines: readonly AllocationLine[], targetKurus: number): PeriodSummary {
  const collected = sumWhere(lines, (l) => l.amountKurus > 0 && l.reason !== 'carry_forward');
  const carriedIn = sumWhere(lines, (l) => l.amountKurus > 0 && l.reason === 'carry_forward');
  const carriedOut = 0 - sumWhere(lines, (l) => l.amountKurus < 0 && l.reason === 'carry_forward');
  const spent = 0 - sumWhere(lines, (l) => l.reason === 'expense');
  const balance = sumLines(lines);
  const available = collected + carriedIn;
  return {
    collected, carriedIn, carriedOut, spent, balance, targetKurus,
    progress: available / targetKurus, covered: available >= targetKurus, surplus: Math.max(0, available - targetKurus),
  };
}

export interface GeneralSummary { balance: number; inflow: number; outflow: number }

export function summarizeGeneral(lines: readonly AllocationLine[]): GeneralSummary {
  const inflow = sumWhere(lines, (l) => l.amountKurus > 0);
  const outflow = 0 - sumWhere(lines, (l) => l.amountKurus < 0);
  return { balance: inflow - outflow, inflow, outflow };
}

export function deriveOneOffStatus(current: CampaignStatus, raised: number, targetKurus: number | null): CampaignStatus {
  if (current !== 'active' && current !== 'funded') return current;
  if (targetKurus === null) return 'active';
  return raised >= targetKurus ? 'funded' : 'active';
}
