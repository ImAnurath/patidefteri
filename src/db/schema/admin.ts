import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums';

export const adminUsers = pgTable('admin_users', {
  id: uuid().defaultRandom().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  role: roleEnum().notNull().default('admin'),
  active: boolean().notNull().default(true),
  failedLogins: integer().notNull().default(0),
  lockedUntil: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid().notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid().defaultRandom().primaryKey(),
  actorId: uuid().references(() => adminUsers.id, { onDelete: 'set null' }),
  action: text().notNull(),
  entity: text().notNull(),
  entityId: uuid(),
  diff: jsonb().$type<Record<string, unknown>>(),
  at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
