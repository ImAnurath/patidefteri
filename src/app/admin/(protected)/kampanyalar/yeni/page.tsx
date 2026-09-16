import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { listAnimals } from '@/db/queries/animals';
import { createCampaignAction } from '../actions';

export default async function NewCampaign() {
  const animals = await listAnimals();
  return (
    <div>
      <h1 className="text-xl mb-4">Yeni kampanya</h1>
      <ActionForm action={createCampaignAction} submitLabel="Oluştur">
        <label>Tür <select name="kind" className="border"><option value="one_off">Tek seferlik</option><option value="recurring">Aylık</option></select></label>
        <LocalizedFields name="title" label="Başlık" />
        <LocalizedFields name="description" label="Açıklama" textarea />
        <label>Anahtar kelimeler (virgülle) <input name="keywords" className="border px-2 py-1 w-full" placeholder="kori" /></label>
        <label>Hedef (TL, tek seferlik için) <input name="target" className="border px-2 py-1 w-full" placeholder="10.500" /></label>
        <label>Hayvan <select name="animalId" className="border"><option value="">—</option>{animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      </ActionForm>
    </div>
  );
}
