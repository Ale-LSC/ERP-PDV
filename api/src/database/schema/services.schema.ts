import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './companies.schema';
import { customers } from './customers.schema';
import { users } from './users.schema';

export const serviceOrderStatusEnum = pgEnum('service_order_status', [
  'open',
  'in_progress',
  'completed',
  'cancelled',
]);
export const serviceOrders = pgTable(
  'service_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 180 }).notNull(),
    description: text('description'),
    status: serviceOrderStatusEnum('status').default('open').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    scheduledAt: timestamp('scheduled_at'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('service_orders_company_status_idx').on(
      table.companyId,
      table.status,
    ),
    check('service_orders_amount_nonnegative', sql`${table.amount} >= 0`),
  ],
);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
]);
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 180 }).notNull(),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    status: appointmentStatusEnum('status').default('scheduled').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('appointments_company_start_idx').on(table.companyId, table.startsAt),
    check(
      'appointments_period_valid',
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const contractBillingCycleEnum = pgEnum('contract_billing_cycle', [
  'monthly',
  'quarterly',
  'annual',
]);
export const contractStatusEnum = pgEnum('contract_status', [
  'draft',
  'active',
  'suspended',
  'ended',
]);
export const serviceContracts = pgTable(
  'service_contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 180 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    billingCycle: contractBillingCycleEnum('billing_cycle').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on'),
    status: contractStatusEnum('status').default('draft').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('service_contracts_company_status_idx').on(
      table.companyId,
      table.status,
    ),
    check('service_contracts_amount_positive', sql`${table.amount} > 0`),
    check(
      'service_contracts_period_valid',
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`,
    ),
  ],
);
