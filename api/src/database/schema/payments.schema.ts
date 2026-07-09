import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { salePayments, sales } from './sales.schema';

export const paymentIntegrationStatusEnum = pgEnum(
  'payment_integration_status',
  [
    'manual',
    'pending',
    'authorized',
    'captured',
    'failed',
    'cancelled',
    'refunded',
  ],
);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    salePaymentId: uuid('sale_payment_id')
      .notNull()
      .references(() => salePayments.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 80 }).default('manual').notNull(),
    status: paymentIntegrationStatusEnum('status').default('manual').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    externalId: varchar('external_id', { length: 160 }),
    authorizationCode: varchar('authorization_code', { length: 80 }),
    nsu: varchar('nsu', { length: 80 }),
    errorMessage: varchar('error_message', { length: 500 }),
    providerPayload: jsonb('provider_payload')
      .$type<Record<string, unknown>>()
      .default({}),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    authorizedAt: timestamp('authorized_at'),
    capturedAt: timestamp('captured_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('payment_transactions_company_status_idx').on(
      table.companyId,
      table.status,
    ),
    index('payment_transactions_sale_idx').on(table.saleId),
    index('payment_transactions_external_idx').on(
      table.provider,
      table.externalId,
    ),
    check('payment_transactions_amount_positive', sql`${table.amount} > 0`),
  ],
);

export type PaymentIntegrationStatus =
  (typeof paymentIntegrationStatusEnum.enumValues)[number];
