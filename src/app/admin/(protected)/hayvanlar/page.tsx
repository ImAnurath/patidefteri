import Link from 'next/link';
import { listAnimals } from '@/db/queries/animals';

export default async function AnimalsAdmin() {
  const rows = await listAnimals();
  return (
    <div>
      <h1 className="text-xl mb-4">Hayvanlar <Link href="/admin/hayvanlar/yeni" className="border px-2 ml-2">Yeni</Link></h1>
      <ul>{rows.map((a) => <li key={a.id}><Link href={`/admin/hayvanlar/${a.id}`}>{a.name}</Link> — {a.species} — {a.status}</li>)}</ul>
    </div>
  );
}
