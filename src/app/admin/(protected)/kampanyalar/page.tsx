import Link from 'next/link';
import { listCampaigns } from '@/db/queries/campaigns';
import { formatKurus } from '@/lib/money';

export default async function CampaignsAdmin() {
  const rows = await listCampaigns();
  return (
    <div>
      <h1 className="text-xl mb-4">Kampanyalar <Link href="/admin/kampanyalar/yeni" className="border px-2 ml-2">Yeni</Link></h1>
      <table className="border-collapse">
        <thead><tr><th className="border px-2">Başlık</th><th className="border px-2">Tür</th><th className="border px-2">Durum</th><th className="border px-2">Hedef</th><th className="border px-2">Anahtar kelimeler</th></tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.id}>
            <td className="border px-2"><Link href={`/admin/kampanyalar/${c.id}`}>{c.title.tr}</Link></td>
            <td className="border px-2">{c.kind}</td><td className="border px-2">{c.status}</td>
            <td className="border px-2">{c.targetKurus ? formatKurus(c.targetKurus, 'tr') : '—'}</td>
            <td className="border px-2">{c.keywords.join(', ')}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
