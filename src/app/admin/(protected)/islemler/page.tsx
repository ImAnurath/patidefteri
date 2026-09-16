import Link from 'next/link';
import { listLedgerTransactions } from '@/db/queries/ledger';
import { formatKurus } from '@/lib/money';

export default async function TransactionsAdmin() {
  const rows = await listLedgerTransactions({ includeUnpublished: true });
  return (
    <div>
      <h1 className="text-xl mb-4">İşlemler <Link href="/admin/islemler/yeni" className="border px-2 ml-2">Yeni</Link></h1>
      <table className="text-sm border-collapse">
        <thead><tr>{['Tarih', 'Yön', 'Tutar', 'Gönderen', 'Açıklama', 'Dağıtım', 'Durum'].map((h) => <th key={h} className="border px-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map(({ tx, lines }) => (
          <tr key={tx.id}>
            <td className="border px-2"><Link href={`/admin/islemler/${tx.id}`}>{tx.occurredAt}</Link></td>
            <td className="border px-2">{tx.direction}</td><td className="border px-2">{formatKurus(tx.amountKurus, 'tr')}</td>
            <td className="border px-2">{tx.displayName}</td><td className="border px-2">{tx.rawNote}</td>
            <td className="border px-2">{lines.length === 0 ? <em>dağıtılmadı</em> : lines.map((l) => `${l.campaignTitle.tr} ${formatKurus(l.amountKurus, 'tr')}`).join(', ')}</td>
            <td className="border px-2">{tx.published ? 'yayında' : 'taslak'}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
