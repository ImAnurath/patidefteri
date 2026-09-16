import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { Localized } from '@/lib/i18n/localized';
import { animals } from './animals';
import { campaigns } from './campaigns';
import { attachments } from './attachments';

export const posts = pgTable('posts', {
  id: uuid().defaultRandom().primaryKey(),
  slug: text().notNull().unique(),
  title: jsonb().$type<Localized>().notNull(),
  body: jsonb().$type<Localized>().notNull(),
  animalId: uuid().references(() => animals.id, { onDelete: 'set null' }),
  campaignId: uuid().references(() => campaigns.id, { onDelete: 'set null' }),
  coverAttachmentId: uuid().references(() => attachments.id, { onDelete: 'set null' }),
  publishedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
