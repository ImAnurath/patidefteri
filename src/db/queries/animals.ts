import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { animals, animalPhotos, adoptionListings } from '@/db/schema';
export type AnimalRow = typeof animals.$inferSelect;

export const listAnimals = () => db.select().from(animals).orderBy(asc(animals.name));
export async function getAnimalBySlug(slug: string) {
  const [a] = await db.select().from(animals).where(eq(animals.slug, slug)).limit(1);
  if (!a) return null;
  const photos = await db.select().from(animalPhotos).where(eq(animalPhotos.animalId, a.id)).orderBy(asc(animalPhotos.sortOrder));
  return { animal: a, photos };
}
export async function getAnimalById(id: string): Promise<AnimalRow | null> {
  const [a] = await db.select().from(animals).where(eq(animals.id, id)).limit(1);
  return a ?? null;
}
export const listAdoptable = () =>
  db.select({ animal: animals, listing: adoptionListings }).from(adoptionListings)
    .innerJoin(animals, eq(adoptionListings.animalId, animals.id))
    .where(eq(adoptionListings.status, 'open')).orderBy(asc(animals.name));
