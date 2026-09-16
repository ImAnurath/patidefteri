import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, bigint, boolean, timestamp, jsonb, date, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Localized } from '@/lib/i18n/localized';
import { quoteStatusEnum } from './enums';
import { attachments } from './attachments';
import { campaigns } from './campaigns';

export const vetPartners = pgTable('vet_partners', {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  clinicName: text().notNull(),
  phone: text().notNull(),
  address: text().notNull(),
  website: text(),
  description: jsonb().$type<Localized>(),
  referralConsent: boolean().notNull().default(false),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const vetQuotes = pgTable('vet_quotes', {
  id: uuid().defaultRandom().primaryKey(),
  vetId: uuid().notNull().references(() => vetPartners.id, { onDelete: 'cascade' }),
  campaignId: uuid().notNull().references((): AnyPgColumn => campaigns.id, { onDelete: 'cascade' }),
  service: jsonb().$type<Localized>().notNull(),
  amountKurus: bigint({ mode: 'number' }).notNull(),
  quotedAt: date().notNull(),
  validUntil: date(),
  documentAttachmentId: uuid().references(() => attachments.id, { onDelete: 'set null' }),
  status: quoteStatusEnum().notNull().default('offered'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('vet_quotes_one_accepted_per_campaign').on(t.campaignId).where(sql`${t.status} = 'accepted'`),
]);
