import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { cashSessions } from './cash.schema';
import { companies } from './companies.schema';
import { products } from './products.schema';
import { users } from './users.schema';
import { customers } from './customers.schema';

export const saleStatusEnum = pgEnum('sale_status', ['completed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'pix',
  'debit_card',
  'credit_card',
]);

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    cashSessionId: uuid('cash_session_id')
      .notNull()
      .references(() => cashSessions.id, { onDelete: 'restrict' }),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    status: saleStatusEnum('status').default('completed').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: uuid('cancelled_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
  },
  (table) => [
    index('sales_company_created_index').on(table.companyId, table.createdAt),
    index('sales_cash_session_index').on(table.cashSessionId),
    check('sales_subtotal_nonnegative', sql`${table.subtotal} >= 0`),
    check('sales_discount_nonnegative', sql`${table.discount} >= 0`),
    check('sales_total_nonnegative', sql`${table.total} >= 0`),
    check('sales_discount_valid', sql`${table.discount} <= ${table.subtotal}`),
  ],
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 180 }).notNull(),
    sku: varchar('sku', { length: 60 }).notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index('sale_items_sale_index').on(table.saleId),
    check('sale_items_quantity_positive', sql`${table.quantity} > 0`),
    check('sale_items_unit_price_nonnegative', sql`${table.unitPrice} >= 0`),
    check('sale_items_total_nonnegative', sql`${table.total} >= 0`),
  ],
);

export const salePayments = pgTable(
  'sale_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    method: paymentMethodEnum('method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    receivedAmount: numeric('received_amount', { precision: 12, scale: 2 }),
    changeAmount: numeric('change_amount', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
  },
  (table) => [
    index('sale_payments_sale_index').on(table.saleId),
    check('sale_payments_amount_positive', sql`${table.amount} > 0`),
    check(
      'sale_payments_received_valid',
      sql`${table.receivedAmount} is null or ${table.receivedAmount} >= ${table.amount}`,
    ),
    check('sale_payments_change_nonnegative', sql`${table.changeAmount} >= 0`),
  ],
);
