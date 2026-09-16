'use server';
import { redirect, unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ANIMAL_STATUSES, SPECIES, ADOPTION_STATUSES } from '@/db/schema/enums';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formFile, formLocalized, formOptional, formString } from '@/lib/forms';
import { localizedSchema } from '@/lib/i18n/localized';
import { isUuid } from '@/lib/uuid';
import { addAnimalPhoto, setAdoptionListing, upsertAnimal } from '@/db/mutations/content';

const schema = z.object({
  name: z.string().min(1), species: z.enum(SPECIES), sex: z.string().nullable(), approxBirthYear: z.number().int().min(1990).max(2100).nullable(),
  status: z.enum(ANIMAL_STATUSES), bio: localizedSchema, location: z.string().nullable(),
});

/** Hidden ids come from the page, so reject junk here instead of letting Postgres raise 22P02. */
function formId(fd: FormData, name: string): string {
  const v = formString(fd, name);
  if (!isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}
/** Same, but the field is empty when the form creates a new record. */
function formIdOrNull(fd: FormData, name: string): string | null {
  const v = formOptional(fd, name);
  if (v !== null && !isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

export async function saveAnimalAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const id = formIdOrNull(fd, 'id');
    const year = formOptional(fd, 'approxBirthYear');
    const input = schema.parse({
      name: formString(fd, 'name'), species: formString(fd, 'species'), sex: formOptional(fd, 'sex'),
      approxBirthYear: year ? Number(year) : null, status: formString(fd, 'status'), bio: formLocalized(fd, 'bio'), location: formOptional(fd, 'location'),
    });
    const row = await upsertAnimal(input, id, user.id);
    const adoptContact = formOptional(fd, 'adoptContact');
    const adoptStatus = formOptional(fd, 'adoptStatus');
    await setAdoptionListing(row.id, adoptContact && adoptStatus ? { status: z.enum(ADOPTION_STATUSES).parse(adoptStatus), contact: adoptContact } : null, user.id);
    revalidatePath('/', 'layout');
    if (!id) redirect(`/admin/hayvanlar/${row.id}`);
    return { ok: true };
  } catch (e) { unstable_rethrow(e); return fail(e); }
}

export async function addPhotoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const file = formFile(fd, 'photo');
  if (!file) return { error: 'Fotoğraf seçin.' };
  try { await addAnimalPhoto(formId(fd, 'animalId'), file, user.id, fd.get('makeCover') === 'on'); } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}
