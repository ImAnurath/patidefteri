import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { auditLog } from '@/db/schema';

export default async function AuditPage() {
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(200);
  return (
    <div>
      <h1 className="text-xl mb-4">Denetim kaydı</h1>
      <table className="text-sm"><tbody>{rows.map((r) => (
        <tr key={r.id}><td className="border px-1">{r.at.toISOString()}</td><td className="border px-1">{r.action}</td><td className="border px-1">{r.entity}</td><td className="border px-1">{r.entityId}</td>
          <td className="border px-1"><details><summary>diff</summary><pre className="text-xs">{JSON.stringify(r.diff, null, 1)}</pre></details></td></tr>))}</tbody></table>
    </div>
  );
}
