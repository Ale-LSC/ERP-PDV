import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { sales } from './sales.schema';
import { users } from './users.schema';

export const fiscalDocumentTypeEnum = pgEnum('fiscal_document_type', [
  'nfce',
  'nfe',
]);

export const fiscalDocumentStatusEnum = pgEnum('fiscal_document_status', [
  'draft',
  'queued',
  'authorized',
  'rejected',
  'cancelled',
  'denied',
  'offline',
]);

export const fiscalDocuments = pgTable(
  'fiscal_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    type: fiscalDocumentTypeEnum('type').default('nfce').notNull(),
    status: fiscalDocumentStatusEnum('status').default('draft').notNull(),
    provider: varchar('provider', { length: 80 }).default('none').notNull(),
    externalId: varchar('external_id', { length: 160 }),
    accessKey: varchar('access_key', { length: 80 }),
    number: varchar('number', { length: 40 }),
    series: varchar('series', { length: 20 }),
    protocol: varchar('protocol', { length: 120 }),
    xmlUrl: varchar('xml_url', { length: 600 }),
    pdfUrl: varchar('pdf_url', { length: 600 }),
    errorMessage: varchar('error_message', { length: 500 }),
    providerPayload: jsonb('provider_payload')
      .$type<Record<string, unknown>>()
      .default({}),
    issuedBy: uuid('issued_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
    issuedAt: timestamp('issued_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('fiscal_documents_sale_type_unique').on(
      table.saleId,
      table.type,
    ),
    index('fiscal_documents_company_status_idx').on(
      table.companyId,
      table.status,
    ),
    index('fiscal_documents_access_key_idx').on(table.accessKey),
  ],
);

export type FiscalDocumentStatus =
  (typeof fiscalDocumentStatusEnum.enumValues)[number];
