'use server';
import { redirect, unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ALLOCATION_REASONS, TX_DIRECTIONS } from '@/db/schema/enums';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formDate, formFile, formKurus, formOptional, formString } from '@/lib/forms';
import { isUuid } from '@/lib/uuid';
import { storeUpload } from '@/lib/storage/upload';
import { createDraftTransaction, saveAllocations, unpublishTransaction, updateTransaction, type DraftInput } from '@/db/mutations/ledger';
import type { AllocationLine } from '@/lib/ledger';

/** Hidden ids come from the page, so reject junk here instead of letting Postgres raise 22P02. */
function formId(fd: FormData, name: string): string {
  const v = formString(fd, name);
  if (!isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}
function formOptionalId(fd: FormData, name: string): string | null {
  const v = formOptional(fd, name);
  if (v !== null && !isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

async function parseDraft(fd: FormData, actorId: string, existingReceipt: string | null): Promise<DraftInput> {
  const direction = z.enum(TX_DIRECTIONS).parse(formString(fd, 'direction'));
  const file = formFile(fd, 'receipt');
  const receiptAttachmentId = file ? (await storeUpload(file, direction === 'in' ? 'receipt' : 'invoice', actorId)).id : existingReceipt;
  return {
    direction, amountKurus: formKurus(fd, 'amount'), occurredAt: formDate(fd, 'occurredAt'),
    rawNote: formOptional(fd, 'rawNote'), displayName: formOptional(fd, 'displayName'),
    receiptAttachmentId, redactionConfirmed: fd.get('redactionConfirmed') === 'on',
  };
}

export async function createTransactionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let id: string;
  try { id = (await createDraftTransaction(await parseDraft(fd, user.id, null), user.id)).id; } catch (e) { unstable_rethrow(e); return fail(e); }
  redirect(`/admin/islemler/${id}`);
}

export async function updateTransactionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const id = formId(fd, 'id');
    await updateTransaction(id, await parseDraft(fd, user.id, formOptionalId(fd, 'existingReceipt')), user.id);
  } catch (e) { unstable_rethrow(e); return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

const lineSchema = z.object({ campaignId: z.uuid(), periodId: z.uuid().nullable(), amountKurus: z.number().int(), reason: z.enum(ALLOCATION_REASONS) });
const lineCountSchema = z.coerce.number().int().nonnegative().max(200);

export async function saveAllocationsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const id = formId(fd, 'id');
    const count = lineCountSchema.parse(formString(fd, 'lineCount'));
    const direction = z.enum(TX_DIRECTIONS).parse(formString(fd, 'direction'));
    const lines: AllocationLine[] = [];
    for (let i = 0; i < count; i++) {
      const amount = formKurus(fd, `line.${i}.amount`);
      lines.push(lineSchema.parse({
        campaignId: formString(fd, `line.${i}.campaignId`), periodId: formOptional(fd, `line.${i}.periodId`),
        amountKurus: direction === 'out' ? -amount : amount, reason: formString(fd, `line.${i}.reason`),
      }));
    }
    await saveAllocations(id, lines, fd.get('publish') === 'on', user.id);
  } catch (e) { unstable_rethrow(e); return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function unpublishAction(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  await unpublishTransaction(formId(fd, 'id'), user.id);
  revalidatePath('/', 'layout');
}
