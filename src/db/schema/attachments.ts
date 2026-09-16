import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { attachmentKindEnum } from './enums';
import { adminUsers } from './admin';

export const attachments = pgTable('attachments', {
  id: uuid().defaultRandom().primaryKey(),
  storageKey: text().notNull().unique(),
  mime: text().notNull(),
  sizeBytes: integer().notNull(),
  sha256: text().notNull(),
  kind: attachmentKindEnum().notNull(),
  originalName: text(),
  uploadedBy: uuid().references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
