'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formFile, formLocalized, formOptional } from '@/lib/forms';
import { localizedSchema } from '@/lib/i18n/localized';
import { isUuid } from '@/lib/uuid';
import { setPostCover, upsertPost } from '@/db/mutations/content';

const schema = z.object({
  title: localizedSchema, body: localizedSchema, animalId: z.uuid().nullable(), campaignId: z.uuid().nullable(), publish: z.boolean(),
});

/** The hidden id comes from the page and is empty when the form creates a new record. */
function formIdOrNull(fd: FormData, name: string): string | null {
  const v = formOptional(fd, name);
  if (v !== null && !isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

export async function savePostAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let id: string | null;
  let rowId: string;
  try {
    id = formIdOrNull(fd, 'id');
    const input = schema.parse({
      title: formLocalized(fd, 'title'), body: formLocalized(fd, 'body'),
      animalId: formOptional(fd, 'animalId'), campaignId: formOptional(fd, 'campaignId'), publish: fd.get('publish') === 'on',
    });
    rowId = (await upsertPost(input, id, user.id)).id;
    const cover = formFile(fd, 'cover');
    if (cover) await setPostCover(rowId, cover, user.id);
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  if (!id) redirect(`/admin/yazilar/${rowId}`);
  return { ok: true };
}
