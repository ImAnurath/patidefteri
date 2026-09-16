'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { vetQuotes } from '@/db/schema';
import { CAMPAIGN_KINDS, CAMPAIGN_STATUSES } from '@/db/schema/enums';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formDate, formKeywords, formKurus, formLocalized, formOptional, formString } from '@/lib/forms';
import { localizedSchema } from '@/lib/i18n/localized';
import { isUuid } from '@/lib/uuid';
import { acceptQuote, addPeriod, createCampaign, setCampaignStatus, updateCampaign } from '@/db/mutations/campaigns';
import { monthPeriodFor } from '@/lib/ledger/periods';
import { writeAudit } from '@/lib/audit';

/** Hidden ids come from the page, so reject junk here instead of letting Postgres raise 22P02. */
function formId(fd: FormData, name: string): string {
  const v = formString(fd, name);
  if (!isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

const campaignSchema = z.object({
  kind: z.enum(CAMPAIGN_KINDS), title: localizedSchema, description: localizedSchema,
  keywords: z.array(z.string()), targetKurus: z.number().int().positive().nullable(), animalId: z.uuid().nullable(),
});

function parseCampaign(fd: FormData) {
  const target = formOptional(fd, 'target');
  return campaignSchema.parse({
    kind: formString(fd, 'kind'), title: formLocalized(fd, 'title'), description: formLocalized(fd, 'description'),
    keywords: formKeywords(fd, 'keywords'), targetKurus: target ? formKurus(fd, 'target') : null, animalId: formOptional(fd, 'animalId'),
  });
}

export async function createCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let id: string;
  try { id = (await createCampaign(parseCampaign(fd), user.id)).id; } catch (e) { return fail(e); }
  redirect(`/admin/kampanyalar/${id}`);
}

export async function updateCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const id = formId(fd, 'id');
    const { kind: _k, ...rest } = parseCampaign(fd);
    await updateCampaign(id, rest, user.id);
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function setCampaignStatusAction(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  const status = z.enum(CAMPAIGN_STATUSES).parse(formString(fd, 'status'));
  await setCampaignStatus(formId(fd, 'id'), status, user.id);
  revalidatePath('/', 'layout');
}

export async function addPeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const monthRaw = formString(fd, 'monthRaw');
    if (!/^\d{4}-\d{2}$/.test(monthRaw)) throw new Error('Geçersiz ay');
    const { periodStart, periodEnd } = monthPeriodFor(`${monthRaw}-01`);
    await addPeriod(formId(fd, 'campaignId'), periodStart, periodEnd, formKurus(fd, 'target'), user.id);
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addQuoteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    await db.transaction(async (tx) => {
      const [q] = await tx.insert(vetQuotes).values({
        campaignId: formId(fd, 'campaignId'), vetId: formId(fd, 'vetId'), service: formLocalized(fd, 'service'),
        amountKurus: formKurus(fd, 'amount'), quotedAt: formDate(fd, 'quotedAt'), validUntil: formOptional(fd, 'validUntil'),
      }).returning();
      await writeAudit(tx, { actorId: user.id, action: 'quote.create', entity: 'vet_quotes', entityId: q!.id, diff: { after: q } });
    });
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function acceptQuoteAction(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  await acceptQuote(formId(fd, 'quoteId'), user.id);
  revalidatePath('/', 'layout');
}
