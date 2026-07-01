import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const companyRoles = [
  'owner',
  'admin',
  'finance',
  'stock',
  'cashier',
] as const;
export const companySegments = [
  'market',
  'industry',
  'retail',
  'services',
  'other',
] as const;
export const companySizes = ['small', 'medium', 'large'] as const;

export const companyRoleEnum = pgEnum('company_role', companyRoles);
export const companySegmentEnum = pgEnum('company_segment', companySegments);
export const companySizeEnum = pgEnum('company_size', companySizes);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  document: varchar('document', { length: 20 }).unique(),
  segment: companySegmentEnum('segment').default('retail').notNull(),
  size: companySizeEnum('size').default('small').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const companyUsers = pgTable(
  'company_users',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: companyRoleEnum('role').default('cashier').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.companyId, table.userId] })],
);

export type CompanyRole = (typeof companyRoles)[number];
export type CompanySegment = (typeof companySegments)[number];
export type CompanySize = (typeof companySizes)[number];
