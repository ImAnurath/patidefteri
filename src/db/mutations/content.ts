import { eq, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { animals, animalPhotos, adoptionListings, posts, vetPartners } from '@/db/schema';
import { pickUniqueSlug, slugify } from '@/lib/slug';
import { writeAudit } from '@/lib/audit';
import { storeUpload } from '@/lib/storage/upload';
import type { Localized } from '@/lib/i18n/localized';
import type { AnimalRow } from '@/db/queries/animals';
import type { VetRow } from '@/db/queries/vets';
import type { PostRow } from '@/db/queries/posts';

export interface AnimalInput {
  name: string; species: AnimalRow['species']; sex: string | null; approxBirthYear: number | null;
  status: AnimalRow['status']; bio: Localized; location: string | null;
}
export async function upsertAnimal(input: AnimalInput, id: string | null, actorId: string): Promise<AnimalRow> {
  return db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(animals).where(eq(animals.id, id)).limit(1);
      if (!before) throw new Error('Hayvan bulunamadı');
      const [after] = await tx.update(animals).set({ ...input, updatedAt: new Date() }).where(eq(animals.id, id)).returning();
      await writeAudit(tx, { actorId, action: 'animal.update', entity: 'animals', entityId: id, diff: { before, after } });
      return after!;
    }
    const root = slugify(input.name) || 'kayit';
    const taken = (await tx.select({ slug: animals.slug }).from(animals).where(like(animals.slug, `${root}%`))).map((r) => r.slug);
    const [row] = await tx.insert(animals).values({ ...input, slug: pickUniqueSlug(input.name, taken) }).returning();
    await writeAudit(tx, { actorId, action: 'animal.create', entity: 'animals', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export async function addAnimalPhoto(animalId: string, file: File, actorId: string, makeCover: boolean): Promise<void> {
  const [animal] = await db.select({ id: animals.id }).from(animals).where(eq(animals.id, animalId)).limit(1);
  if (!animal) throw new Error('Hayvan bulunamadı');
  const att = await storeUpload(file, 'photo', actorId);
  await db.transaction(async (tx) => {
    await tx.insert(animalPhotos).values({ animalId, attachmentId: att.id });
    if (makeCover) await tx.update(animals).set({ coverAttachmentId: att.id, updatedAt: new Date() }).where(eq(animals.id, animalId));
    await writeAudit(tx, { actorId, action: 'animal.photo', entity: 'animals', entityId: animalId, diff: { attachmentId: att.id, makeCover } });
  });
}

export async function setAdoptionListing(animalId: string, listing: { status: 'open' | 'pending' | 'closed'; contact: string } | null, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(adoptionListings).where(eq(adoptionListings.animalId, animalId));
    if (listing) await tx.insert(adoptionListings).values({ animalId, status: listing.status, contact: listing.contact, source: 'own' });
    await writeAudit(tx, { actorId, action: 'adoption.set', entity: 'adoption_listings', entityId: animalId, diff: { listing } });
  });
}

export interface VetInput {
  name: string; clinicName: string; phone: string; address: string; website: string | null; description: Localized | null; referralConsent: boolean; active: boolean;
}
export async function upsertVet(input: VetInput, id: string | null, actorId: string): Promise<VetRow> {
  return db.transaction(async (tx) => {
    if (id) {
      const [after] = await tx.update(vetPartners).set({ ...input, updatedAt: new Date() }).where(eq(vetPartners.id, id)).returning();
      if (!after) throw new Error('Veteriner bulunamadı');
      await writeAudit(tx, { actorId, action: 'vet.update', entity: 'vet_partners', entityId: id, diff: { after } });
      return after;
    }
    const [row] = await tx.insert(vetPartners).values(input).returning();
    await writeAudit(tx, { actorId, action: 'vet.create', entity: 'vet_partners', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export interface PostInput { title: Localized; body: Localized; animalId: string | null; campaignId: string | null; publish: boolean }
export async function upsertPost(input: PostInput, id: string | null, actorId: string): Promise<PostRow> {
  const { publish, ...fields } = input;
  return db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!before) throw new Error('Yazı bulunamadı');
      const publishedAt = publish ? (before.publishedAt ?? new Date()) : null;
      const [after] = await tx.update(posts).set({ ...fields, publishedAt, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
      await writeAudit(tx, { actorId, action: 'post.update', entity: 'posts', entityId: id, diff: { before, after } });
      return after!;
    }
    const root = slugify(input.title.tr) || 'kayit';
    const taken = (await tx.select({ slug: posts.slug }).from(posts).where(like(posts.slug, `${root}%`))).map((r) => r.slug);
    const [row] = await tx.insert(posts).values({ ...fields, slug: pickUniqueSlug(input.title.tr, taken), publishedAt: publish ? new Date() : null }).returning();
    await writeAudit(tx, { actorId, action: 'post.create', entity: 'posts', entityId: row!.id, diff: { after: row } });
    return row!;
  });
}

export async function setPostCover(postId: string, file: File, actorId: string): Promise<void> {
  const att = await storeUpload(file, 'photo', actorId);
  await db.transaction(async (tx) => {
    await tx.update(posts).set({ coverAttachmentId: att.id, updatedAt: new Date() }).where(eq(posts.id, postId));
    await writeAudit(tx, { actorId, action: 'post.cover', entity: 'posts', entityId: postId, diff: { attachmentId: att.id } });
  });
}
