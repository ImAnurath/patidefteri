import Link from 'next/link';
import { listPosts } from '@/db/queries/posts';

export default async function PostsAdmin() {
  const rows = await listPosts({ includeDrafts: true });
  return (
    <div>
      <h1 className="text-xl mb-4">Yazılar <Link href="/admin/yazilar/yeni" className="border px-2 ml-2">Yeni</Link></h1>
      <ul>{rows.map((p) => <li key={p.id}><Link href={`/admin/yazilar/${p.id}`}>{p.title.tr}</Link> {p.publishedAt ? '' : '(taslak)'}</li>)}</ul>
    </div>
  );
}
