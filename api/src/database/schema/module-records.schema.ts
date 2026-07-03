import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies, companyModuleEnum } from './companies.schema';
import { users } from './users.schema';

export const moduleRecordStatusEnum = pgEnum('module_record_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const moduleRecords = pgTable(
  'module_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    module: companyModuleEnum('module').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: moduleRecordStatusEnum('status').default('pending').notNull(),
    dueAt: timestamp('due_at'),
    data: jsonb('data').$type<Record<string, unknown>>().default({}),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('module_records_company_module_idx').on(
      table.companyId,
      table.module,
    ),
  ],
);
