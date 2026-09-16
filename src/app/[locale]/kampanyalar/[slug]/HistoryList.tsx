import type { HistoryRow } from '@/db/queries/ledger';
import { formatKurus } from '@/lib/money';
import { t } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/locale';

export function HistoryList({ rows, locale }: { rows: HistoryRow[]; locale: Locale }) {
  return (
    <table className="text-sm border-collapse w-full">
      <thead><tr><th className="border px-2 text-left">{t(locale, 'ledger.date')}</th><th className="border px-2 text-left">{t(locale, 'ledger.direction')}</th><th className="border px-2 text-left">{t(locale, 'ledger.amount')}</th><th className="border px-2 text-left">{t(locale, 'ledger.name')}</th><th className="border px-2 text-left">{t(locale, 'ledger.receipt')}</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id}>
          <td className="border px-2">{r.date}</td>
          <td className="border px-2">{t(locale, `reason.${r.reason}`)}{r.note ? ` — ${r.note}` : ''}</td>
          <td className="border px-2">{formatKurus(r.amountKurus, locale)}</td>
          <td className="border px-2">{r.displayName ?? '—'}</td>
          <td className="border px-2">{r.receiptAttachmentId ? <a href={`/dosya/${r.receiptAttachmentId}`} target="_blank" rel="noopener noreferrer" className="underline">PDF</a> : '—'}</td>
        </tr>))}</tbody>
    </table>
  );
}
