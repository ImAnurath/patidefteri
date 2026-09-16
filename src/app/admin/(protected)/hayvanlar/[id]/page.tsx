import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adoptionListings, animalPhotos } from '@/db/schema';
import { ANIMAL_STATUSES, SPECIES, ADOPTION_STATUSES } from '@/db/schema/enums';
import { getAnimalById } from '@/db/queries/animals';
import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { isUuid } from '@/lib/uuid';
import { saveAnimalAction, addPhotoAction } from '../actions';

export default async function AnimalAdmin(props: PageProps<'/admin/hayvanlar/[id]'>) {
  const { id } = await props.params;
  const isNew = id === 'yeni';
  if (!isNew && !isUuid(id)) notFound();
  const a = isNew ? null : await getAnimalById(id);
  if (!isNew && !a) notFound();
  const listing = a ? (await db.select().from(adoptionListings).where(eq(adoptionListings.animalId, a.id)).limit(1))[0] : undefined;
  const photos = a ? await db.select().from(animalPhotos).where(eq(animalPhotos.animalId, a.id)).orderBy(asc(animalPhotos.sortOrder), asc(animalPhotos.id)) : [];
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl">{a ? a.name : 'Yeni hayvan'}</h1>
      <ActionForm action={saveAnimalAction}>
        {a && <input type="hidden" name="id" value={a.id} />}
        <label>Ad <input name="name" defaultValue={a?.name ?? ''} required className="border px-2 py-1 w-full" /></label>
        <label>Tür <select name="species" defaultValue={a?.species ?? 'dog'} className="border">{SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Cinsiyet <input name="sex" defaultValue={a?.sex ?? ''} className="border px-2 py-1" /></label>
        <label>Tahmini doğum yılı <input name="approxBirthYear" type="number" defaultValue={a?.approxBirthYear ?? ''} className="border px-2 py-1" /></label>
        <label>Durum <select name="status" defaultValue={a?.status ?? 'street'} className="border">{ANIMAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <LocalizedFields name="bio" label="Hikâye" value={a?.bio} textarea />
        <label>Konum <input name="location" defaultValue={a?.location ?? ''} className="border px-2 py-1 w-full" /></label>
        <fieldset className="border p-2"><legend>Sahiplendirme ilanı (boş bırakılırsa ilan yok)</legend>
          <label>Durum <select name="adoptStatus" defaultValue={listing?.status ?? ''} className="border"><option value="">—</option>{ADOPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label>İletişim <input name="adoptContact" defaultValue={listing?.contact ?? ''} className="border px-2 py-1 w-full" /></label>
        </fieldset>
      </ActionForm>
      {a && (
        <section>
          <h2 className="font-bold">Fotoğraflar</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- /dosya streams private objects from S3; next/image cannot optimize them. */}
          <div className="flex gap-2 flex-wrap">{photos.map((p) => <img key={p.id} src={`/dosya/${p.attachmentId}`} alt="" className="h-24 border" />)}</div>
          <ActionForm action={addPhotoAction} submitLabel="Yükle">
            <input type="hidden" name="animalId" value={a.id} />
            <input type="file" name="photo" accept="image/*" required />
            <label><input type="checkbox" name="makeCover" /> Kapak yap</label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
