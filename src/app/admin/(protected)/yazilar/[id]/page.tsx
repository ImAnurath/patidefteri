import { notFound } from 'next/navigation';
import { getPostById } from '@/db/queries/posts';
import { listAnimals } from '@/db/queries/animals';
import { listCampaigns } from '@/db/queries/campaigns';
import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { isUuid } from '@/lib/uuid';
import { savePostAction } from '../actions';

export default async function PostAdmin(props: PageProps<'/admin/yazilar/[id]'>) {
  const { id } = await props.params;
  const isNew = id === 'yeni';
  if (!isNew && !isUuid(id)) notFound();
  const p = isNew ? null : await getPostById(id);
  if (!isNew && !p) notFound();
  const [animals, campaigns] = await Promise.all([listAnimals(), listCampaigns()]);
  return (
    <div>
      <h1 className="text-xl mb-4">{p ? p.title.tr : 'Yeni yazı'}</h1>
      <ActionForm action={savePostAction}>
        {p && <input type="hidden" name="id" value={p.id} />}
        <LocalizedFields name="title" label="Başlık" value={p?.title} />
        <LocalizedFields name="body" label="Metin (Markdown)" value={p?.body} textarea />
        <label>Hayvan <select name="animalId" defaultValue={p?.animalId ?? ''} className="border"><option value="">—</option>{animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Kampanya <select name="campaignId" defaultValue={p?.campaignId ?? ''} className="border"><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title.tr}</option>)}</select></label>
        <label>Kapak <input type="file" name="cover" accept="image/*" /></label>
        <label><input type="checkbox" name="publish" defaultChecked={Boolean(p?.publishedAt)} /> Yayında</label>
      </ActionForm>
    </div>
  );
}
