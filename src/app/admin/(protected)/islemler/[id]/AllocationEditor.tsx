'use client';
import { useState } from 'react';
import { parseTlToKurus } from '@/lib/money';
import type { AllocationLine } from '@/lib/ledger/types';

type Campaign = { id: string; title: string; kind: 'one_off' | 'recurring' | 'general' };
type Props = { initial: AllocationLine[]; direction: 'in' | 'out'; totalKurus: number; campaigns: Campaign[]; periodsByCampaign: Record<string, { id: string; label: string }[]> };
const tl = (k: number) => (Math.abs(k) / 100).toFixed(2).replace('.', ',');
/** The live total must survive half-typed amounts, so an unparseable field counts as zero. */
const kurusOrZero = (amount: string) => { try { return parseTlToKurus(amount); } catch { return 0; } };

export function AllocationEditor({ initial, direction, totalKurus, campaigns, periodsByCampaign }: Props) {
  const [rows, setRows] = useState(initial.map((l) => ({ ...l, amount: tl(l.amountKurus) })));
  const sum = rows.reduce((a, r) => a + kurusOrZero(r.amount), 0);
  const reasons: AllocationLine['reason'][] = direction === 'in' ? ['note_match', 'manual', 'correction'] : ['expense'];
  const first = campaigns[0]; // undefined when no campaign is open, so a new row has nothing to point at
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="lineCount" value={rows.length} />
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select name={`line.${i}.campaignId`} value={r.campaignId} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, campaignId: e.target.value, periodId: null } : x))} className="border">
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {campaigns.find((c) => c.id === r.campaignId)?.kind === 'recurring' && (
            <select name={`line.${i}.periodId`} value={r.periodId ?? ''} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, periodId: e.target.value || null } : x))} className="border">
              <option value="">dönem seç</option>
              {(periodsByCampaign[r.campaignId] ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
          <input name={`line.${i}.amount`} value={r.amount} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className="border px-2 w-32" />
          <select name={`line.${i}.reason`} value={r.reason} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, reason: e.target.value as AllocationLine['reason'] } : x))} className="border">
            {reasons.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="border px-1">sil</button>
        </div>
      ))}
      <button type="button" disabled={!first} onClick={() => first && setRows([...rows, { campaignId: first.id, periodId: null, amountKurus: 0, reason: reasons[0]!, amount: '0,00' }])} className="border px-2 self-start disabled:opacity-50">satır ekle</button>
      <p className={sum === totalKurus ? 'text-green-700' : 'text-red-700'}>Toplam {tl(sum)} / {tl(totalKurus)} TL</p>
    </div>
  );
}
