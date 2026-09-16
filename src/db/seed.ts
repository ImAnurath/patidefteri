import { eq } from 'drizzle-orm';
import { db } from './client';
import { adminUsers, animals, campaigns, campaignPeriods, vetPartners, vetQuotes } from './schema';
import { env } from '@/env';
import { hashPassword } from '@/lib/auth/password';
import { ensureBucket } from '@/lib/storage/client';
import { monthPeriodFor } from '@/lib/ledger/periods';

async function main() {
  const e = env();
  await ensureBucket();

  const email = e.ADMIN_EMAIL.toLowerCase();
  const [existingAdmin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (!existingAdmin) {
    await db.insert(adminUsers).values({ email, passwordHash: await hashPassword(e.ADMIN_PASSWORD) });
    console.log('admin created:', email);
  }

  const [general] = await db.select().from(campaigns).where(eq(campaigns.kind, 'general')).limit(1);
  if (!general) {
    await db.insert(campaigns).values({
      slug: 'genel-butce', kind: 'general', status: 'active',
      title: { tr: 'Genel bütçe', en: 'General budget' },
      description: { tr: 'Açıklamasız bağışlar ve kampanya fazlaları burada toplanır; acil durumlar ve eksik kalan kampanyalar buradan karşılanır.', en: 'Unmarked donations and campaign surpluses collect here; emergencies and shortfalls are covered from it.' },
    });
    console.log('general campaign created');
  }

  if (!(await db.select().from(animals).where(eq(animals.slug, 'kori')).limit(1))[0]) {
    const [kori] = await db.insert(animals).values({
      slug: 'kori', name: 'Kori', species: 'dog', status: 'in_treatment', location: 'Altınordu, Ordu',
      bio: { tr: 'Arka bacağından yaralı sokak köpeği. Ameliyat gerekiyor.', en: 'Street dog with an injured hind leg. Needs surgery.' },
    }).returning();
    const [vet] = await db.insert(vetPartners).values({
      name: 'Örnek Veteriner', clinicName: 'Örnek Veteriner Kliniği', phone: '+90 452 000 00 00', address: 'Ordu', referralConsent: true,
    }).returning();
    const [camp] = await db.insert(campaigns).values({
      slug: 'kori-ameliyat', kind: 'one_off', status: 'active', animalId: kori!.id, keywords: ['kori'],
      title: { tr: "Kori'nin ameliyatı", en: "Kori's surgery" },
      description: { tr: 'Femur kırığı ameliyatı.', en: 'Femur fracture surgery.' }, openedAt: new Date(),
    }).returning();
    const [quote] = await db.insert(vetQuotes).values({
      vetId: vet!.id, campaignId: camp!.id, service: { tr: 'Femur ameliyatı', en: 'Femur surgery' }, amountKurus: 1050000, quotedAt: new Date().toISOString().slice(0, 10), status: 'accepted',
    }).returning();
    await db.update(campaigns).set({ targetKurus: quote!.amountKurus, acceptedQuoteId: quote!.id }).where(eq(campaigns.id, camp!.id));
    console.log('sample animal, vet, campaign created');
  }

  if (!(await db.select().from(campaigns).where(eq(campaigns.slug, 'mama')).limit(1))[0]) {
    const [mama] = await db.insert(campaigns).values({
      slug: 'mama', kind: 'recurring', status: 'active', keywords: ['mama', 'yemek'],
      title: { tr: 'Aylık mama', en: 'Monthly food' }, description: { tr: 'Mahalledeki köpeklerin aylık mama gideri.', en: 'Monthly food for the neighbourhood dogs.' }, openedAt: new Date(),
    }).returning();
    const { periodStart, periodEnd } = monthPeriodFor(new Date().toISOString().slice(0, 10));
    await db.insert(campaignPeriods).values({ campaignId: mama!.id, periodStart, periodEnd, targetKurus: 300000 });
    console.log('recurring campaign created');
  }
  console.log('seed done');
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
