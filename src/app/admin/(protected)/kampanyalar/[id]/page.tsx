import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { getCampaignById, listPeriods } from '@/db/queries/campaigns';
import { listAnimals } from '@/db/queries/animals';
import { listVets, listQuotesForCampaign } from '@/db/queries/vets';
import { getCampaignSummary } from '@/db/queries/summaries';
import { formatKurus } from '@/lib/money';
import { isUuid } from '@/lib/uuid';
import { CAMPAIGN_STATUSES } from '@/db/schema/enums';
import { updateCampaignAction, setCampaignStatusAction, addPeriodAction, addQuoteAction, acceptQuoteAction } from '../actions';
import { CompletionPanel } from './CompletionPanel';

export default async function CampaignAdmin(props: PageProps<'/admin/kampanyalar/[id]'>) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const c = await getCampaignById(id);
  if (!c) notFound();
  const [animals, vets, quotes, periods, summary] = await Promise.all([listAnimals(), listVets(false), listQuotesForCampaign(c.id), listPeriods(c.id), getCampaignSummary(c)]);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl">{c.title.tr} <span className="text-sm border px-1">{c.status}</span></h1>
      <pre className="text-xs bg-gray-100 p-2 overflow-auto">{JSON.stringify(summary, null, 2)}</pre>

      <ActionForm action={updateCampaignAction}>
        <input type="hidden" name="id" value={c.id} /><input type="hidden" name="kind" value={c.kind} />
        <LocalizedFields name="title" label="Başlık" value={c.title} />
        <LocalizedFields name="description" label="Açıklama" value={c.description} textarea />
        <label>Anahtar kelimeler <input name="keywords" defaultValue={c.keywords.join(', ')} className="border px-2 py-1 w-full" /></label>
        {c.kind === 'one_off' && <label>Hedef (TL) <input name="target" defaultValue={c.targetKurus ? (c.targetKurus / 100).toString() : ''} className="border px-2 py-1 w-full" /></label>}
        <label>Hayvan <select name="animalId" defaultValue={c.animalId ?? ''} className="border"><option value="">—</option>{animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      </ActionForm>

      {c.kind !== 'general' && (
        <form action={setCampaignStatusAction} className="flex gap-2 items-center">
          <input type="hidden" name="id" value={c.id} />
          <select name="status" defaultValue={c.status} className="border">{CAMPAIGN_STATUSES.filter((s) => s !== 'completed').map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <button className="border px-2">Durumu değiştir</button>
        </form>
      )}

      {c.kind === 'one_off' && <CompletionPanel campaignId={c.id} />}

      {c.kind === 'recurring' && (
        <section>
          <h2 className="font-bold">Dönemler</h2>
          <ul>{periods.map((p) => <li key={p.id}>{p.periodStart} – {p.periodEnd}: hedef {formatKurus(p.targetKurus, 'tr')} {p.closedAt ? '(kapandı)' : ''}</li>)}</ul>
          <ActionForm action={addPeriodAction} submitLabel="Dönem ekle">
            <input type="hidden" name="campaignId" value={c.id} />
            <label>Ay <input type="month" name="monthRaw" required className="border" /></label>
            <label>Hedef (TL) <input name="target" required className="border px-2 py-1" /></label>
          </ActionForm>
        </section>
      )}

      {c.kind === 'one_off' && (
        <section>
          <h2 className="font-bold">Veteriner teklifleri</h2>
          <ul>{quotes.map(({ quote, vet }) => (
            <li key={quote.id} className="flex gap-2 items-center">
              {vet.clinicName}: {quote.service.tr} — {formatKurus(quote.amountKurus, 'tr')} [{quote.status}]
              {quote.status !== 'accepted' && <form action={acceptQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><button className="border px-1">Kabul et</button></form>}
            </li>))}</ul>
          <ActionForm action={addQuoteAction} submitLabel="Teklif ekle">
            <input type="hidden" name="campaignId" value={c.id} />
            <label>Klinik <select name="vetId" className="border">{vets.map((v) => <option key={v.id} value={v.id}>{v.clinicName}</option>)}</select></label>
            <LocalizedFields name="service" label="Hizmet" />
            <label>Tutar (TL) <input name="amount" required className="border px-2 py-1" /></label>
            <label>Teklif tarihi <input type="date" name="quotedAt" required className="border" /></label>
            <label>Geçerlilik <input type="date" name="validUntil" className="border" /></label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
