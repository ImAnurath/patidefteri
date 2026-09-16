import Link from 'next/link';
import { listVets } from '@/db/queries/vets';

export default async function VetsAdmin() {
  const rows = await listVets(false);
  return (
    <div>
      <h1 className="text-xl mb-4">Veterinerler <Link href="/admin/veterinerler/yeni" className="border px-2 ml-2">Yeni</Link></h1>
      <ul>{rows.map((v) => <li key={v.id}><Link href={`/admin/veterinerler/${v.id}`}>{v.clinicName}</Link> — {v.name} {v.active ? '' : '(pasif)'}</li>)}</ul>
    </div>
  );
}
