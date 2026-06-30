import {
  boolean,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { users } from './users.schema';

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    code: varchar('code', { length: 30 }).notNull(),
    address: varchar('address', { length: 240 }),
    isHeadquarters: boolean('is_headquarters').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('branches_company_code_unique').on(table.companyId, table.code),
  ],
);

export const branchUsers = pgTable(
  'branch_users',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.branchId, table.userId] })],
);
