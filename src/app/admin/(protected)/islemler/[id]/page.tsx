import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/ActionForm';
import { getTransactionWithLines } from '@/db/queries/ledger';
import { listCampaigns, listPeriods } from '@/db/queries/campaigns';
import { suggestForTransaction } from '@/db/mutations/ledger';
import { isUuid } from '@/lib/uuid';
import { TransactionFields } from '../TransactionFields';
import { updateTransactionAction, saveAllocationsAction, unpublishAction } from '../actions';
import { AllocationEditor } from './AllocationEditor';

export default async function TransactionAdmin(props: PageProps<'/admin/islemler/[id]'>) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const data = await getTransactionWithLines(id);
  if (!data) notFound();
  const { tx, lines } = data;
  const campaigns = await listCampaigns({ statuses: ['active', 'funded'] });
  const periodsByCampaign: Record<string, { id: string; label: string }[]> = {};
  // Open periods only: a closed period is already carried forward, and saving into one is rejected.
  for (const c of campaigns.filter((c) => c.kind === 'recurring')) periodsByCampaign[c.id] = (await listPeriods(c.id)).filter((p) => p.closedAt === null).map((p) => ({ id: p.id, label: p.periodStart.slice(0, 7) }));
  const initial = lines.length > 0
    ? lines.map((l) => ({ campaignId: l.campaignId, periodId: l.periodId, amountKurus: l.amountKurus, reason: l.reason }))
    : (await suggestForTransaction(tx.id)).lines;
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl">İşlem {tx.occurredAt} — {tx.published ? 'yayında' : 'taslak'}</h1>
      <ActionForm action={updateTransactionAction}><TransactionFields tx={tx} /></ActionForm>
      <section>
        <h2 className="font-bold">Dağıtım</h2>
        <p className="text-sm">{lines.length === 0 ? 'Açıklamaya göre önerilen dağıtım. Düzenleyip onaylayın.' : 'Mevcut dağıtım.'}</p>
        <ActionForm action={saveAllocationsAction} submitLabel="Dağıtımı kaydet">
          <input type="hidden" name="id" value={tx.id} /><input type="hidden" name="direction" value={tx.direction} />
          <AllocationEditor
            initial={initial} direction={tx.direction} totalKurus={tx.amountKurus}
            campaigns={campaigns.map((c) => ({ id: c.id, title: c.title.tr, kind: c.kind }))} periodsByCampaign={periodsByCampaign}
          />
          <label><input type="checkbox" name="publish" defaultChecked={tx.published} /> Yayınla (defterde görünsün)</label>
        </ActionForm>
        {tx.published && <form action={unpublishAction}><input type="hidden" name="id" value={tx.id} /><button className="border px-2 mt-2">Yayından kaldır</button></form>}
      </section>
    </div>
  );
}
