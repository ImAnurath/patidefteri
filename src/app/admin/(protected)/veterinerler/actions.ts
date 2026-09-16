'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formLocalized, formOptional, formString } from '@/lib/forms';
import { localizedSchema } from '@/lib/i18n/localized';
import { isUuid } from '@/lib/uuid';
import { upsertVet } from '@/db/mutations/content';

const schema = z.object({
  name: z.string().min(1), clinicName: z.string().min(1), phone: z.string().min(1), address: z.string().min(1),
  website: z.string().nullable(), description: localizedSchema.nullable(), referralConsent: z.boolean(), active: z.boolean(),
});

/** The hidden id comes from the page and is empty when the form creates a new record. */
function formIdOrNull(fd: FormData, name: string): string | null {
  const v = formOptional(fd, name);
  if (v !== null && !isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

export async function saveVetAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let id: string | null;
  let rowId: string;
  try {
    id = formIdOrNull(fd, 'id');
    const hasDesc = formOptional(fd, 'description.tr') !== null;
    const input = schema.parse({
      name: formString(fd, 'name'), clinicName: formString(fd, 'clinicName'), phone: formString(fd, 'phone'), address: formString(fd, 'address'),
      website: formOptional(fd, 'website'), description: hasDesc ? formLocalized(fd, 'description') : null,
      referralConsent: fd.get('referralConsent') === 'on', active: fd.get('active') === 'on',
    });
    rowId = (await upsertVet(input, id, user.id)).id;
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  if (!id) redirect(`/admin/veterinerler/${rowId}`);
  return { ok: true };
}
