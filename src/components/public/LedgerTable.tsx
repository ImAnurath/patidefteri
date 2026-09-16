import Link from 'next/link';
import type { LedgerRow } from '@/db/queries/ledger';
import { formatKurus } from '@/lib/money';
import { localePath, type Locale } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';

// KVKK: `transactions.rawNote` is where donors write their own names, so it never leaves the admin
// area. The public identity of a transaction is the masked `displayName` column below.
const COLUMNS = ['ledger.date', 'ledger.direction', 'ledger.amount', 'ledger.name', 'ledger.allocatedTo', 'ledger.receipt'] as const;

export function LedgerTable({ rows, locale }: { rows: LedgerRow[]; locale: Locale }) {
  const byMonth = new Map<string, LedgerRow[]>();
  for (const r of rows) { const m = r.tx.occurredAt.slice(0, 7); byMonth.set(m, [...(byMonth.get(m) ?? []), r]); }
  return (
    <div className="flex flex-col gap-6">
      {[...byMonth.entries()].map(([month, list]) => {
        const inSum = list.filter((r) => r.tx.direction === 'in').reduce((a, r) => a + r.tx.amountKurus, 0);
        const outSum = list.filter((r) => r.tx.direction === 'out').reduce((a, r) => a + r.tx.amountKurus, 0);
        return (
          <section key={month}>
            <h3 className="font-bold">{month}</h3>
            <table className="text-sm border-collapse w-full">
              <thead><tr>{COLUMNS.map((k) => <th key={k} className="border px-2 text-left">{t(locale, k)}</th>)}</tr></thead>
              <tbody>{list.map(({ tx, lines }) => (
                <tr key={tx.id}>
                  <td className="border px-2">{tx.occurredAt}</td>
                  <td className="border px-2">{t(locale, tx.direction === 'in' ? 'ledger.in' : 'ledger.out')}</td>
                  <td className="border px-2">{formatKurus(tx.direction === 'in' ? tx.amountKurus : -tx.amountKurus, locale)}</td>
                  <td className="border px-2">{tx.displayName ?? '—'}</td>
                  <td className="border px-2">{lines.map((l) => <Link key={`${l.campaignId}:${l.periodId ?? ''}`} href={localePath(locale, `/kampanyalar/${l.campaignSlug}`)} className="underline mr-2">{pickLocalized(l.campaignTitle, locale)} {formatKurus(Math.abs(l.amountKurus), locale)}</Link>)}</td>
                  <td className="border px-2">{tx.receiptAttachmentId ? <a href={`/dosya/${tx.receiptAttachmentId}`} target="_blank" rel="noopener noreferrer" className="underline">PDF</a> : '—'}</td>
                </tr>))}</tbody>
              <tfoot><tr><td colSpan={COLUMNS.length} className="border px-2">{t(locale, 'ledger.monthTotal')}: +{formatKurus(inSum, locale)} / −{formatKurus(outSum, locale)}</td></tr></tfoot>
            </table>
          </section>
        );
      })}
    </div>
  );
}
