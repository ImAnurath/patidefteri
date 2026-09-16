import { ActionForm } from '@/components/admin/ActionForm';
import { listCampaigns, listPeriods } from '@/db/queries/campaigns';
import { transferAction, closePeriodAction } from './actions';

type Option = { id: string; label: string };
const BLANK_PERIOD = '— (aylık değilse boş)';

/** Declared at module level: a component created during render is recreated on every render. */
function IdSelect({ name, options, blank }: { name: string; options: Option[]; blank?: string }) {
  return (
    <select name={name} className="border">
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export default async function TransfersAdmin() {
  const campaigns = await listCampaigns({ statuses: ['active', 'funded'] });
  const recurring = campaigns.filter((c) => c.kind === 'recurring');
  const campaignOptions: Option[] = campaigns.map((c) => ({ id: c.id, label: c.title.tr }));
  const periodOptions: Option[] = [];
  const openPeriods: Option[] = [];
  for (const c of recurring) for (const p of await listPeriods(c.id)) {
    periodOptions.push({ id: p.id, label: `${c.title.tr} ${p.periodStart.slice(0, 7)}` });
    if (!p.closedAt) openPeriods.push({ id: p.id, label: `${c.title.tr} ${p.periodStart.slice(0, 7)}` });
  }
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl">Aktarım</h1>
        <ActionForm action={transferAction} submitLabel="Aktar">
          <label>Kaynak <IdSelect name="fromCampaignId" options={campaignOptions} /> <IdSelect name="fromPeriodId" options={periodOptions} blank={BLANK_PERIOD} /></label>
          <label>Hedef <IdSelect name="toCampaignId" options={campaignOptions} /> <IdSelect name="toPeriodId" options={periodOptions} blank={BLANK_PERIOD} /></label>
          <label>Tutar (TL) <input name="amount" required className="border px-2 py-1" /></label>
          <label>Sebep <select name="reason" className="border"><option value="top_up_from_general">Genel bütçeden takviye</option><option value="surplus_to_general">Fazlayı genel bütçeye</option><option value="correction">Düzeltme</option></select></label>
          <label>Not <input name="note" className="border px-2 py-1 w-full" /></label>
        </ActionForm>
      </section>
      <section>
        <h2 className="font-bold">Ay kapat (fazlayı sonraki aya devret)</h2>
        <ActionForm action={closePeriodAction} submitLabel="Ayı kapat">
          <IdSelect name="periodId" options={openPeriods} />
        </ActionForm>
      </section>
    </div>
  );
}
