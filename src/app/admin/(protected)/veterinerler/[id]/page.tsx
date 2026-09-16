import { notFound } from 'next/navigation';
import { getVetById, listQuotesForVet } from '@/db/queries/vets';
import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { formatKurus } from '@/lib/money';
import { isUuid } from '@/lib/uuid';
import { saveVetAction } from '../actions';

export default async function VetAdmin(props: PageProps<'/admin/veterinerler/[id]'>) {
  const { id } = await props.params;
  const isNew = id === 'yeni';
  if (!isNew && !isUuid(id)) notFound();
  const v = isNew ? null : await getVetById(id);
  if (!isNew && !v) notFound();
  const quotes = v ? await listQuotesForVet(v.id) : [];
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl">{v ? v.clinicName : 'Yeni veteriner'}</h1>
      <ActionForm action={saveVetAction}>
        {v && <input type="hidden" name="id" value={v.id} />}
        <label>Klinik adı <input name="clinicName" defaultValue={v?.clinicName ?? ''} required className="border px-2 py-1 w-full" /></label>
        <label>Hekim adı <input name="name" defaultValue={v?.name ?? ''} required className="border px-2 py-1 w-full" /></label>
        <label>Telefon <input name="phone" defaultValue={v?.phone ?? ''} required className="border px-2 py-1 w-full" /></label>
        <label>Adres <input name="address" defaultValue={v?.address ?? ''} required className="border px-2 py-1 w-full" /></label>
        <label>Web <input name="website" defaultValue={v?.website ?? ''} className="border px-2 py-1 w-full" /></label>
        <LocalizedFields name="description" label="Açıklama" value={v?.description} textarea required={false} />
        <label><input type="checkbox" name="referralConsent" defaultChecked={v?.referralConsent ?? false} /> Fiyatlarıyla listelenmeyi kabul etti</label>
        <label><input type="checkbox" name="active" defaultChecked={v?.active ?? true} /> Aktif</label>
      </ActionForm>
      {v && <section><h2 className="font-bold">Teklifleri</h2><ul>{quotes.map(({ quote, campaign }) => <li key={quote.id}>{campaign.title.tr}: {quote.service.tr} — {formatKurus(quote.amountKurus, 'tr')} [{quote.status}]</li>)}</ul></section>}
    </div>
  );
}
