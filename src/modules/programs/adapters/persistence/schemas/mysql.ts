// Schema Drizzle (mysql-core) do módulo programs. Prefixo `prg_*` (ADR-0014).
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual na migration (drizzle-orm 0.45.x não
// expõe charset/collate table-level):
//   - Por tabela: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//   - Em colunas UUID (`id`, `event_id`, `aggregate_id`): `COLLATE utf8mb4_bin`
//
// ADR-0020: sem JSON nativo (payload do outbox é varchar), sem ENUM (status via
// varchar + CHECK), sem AUTO_INCREMENT em PK de domínio (id é UUID v4 do domínio;
// program_number é sequencial de exibição gerado pela aplicação).

import {
  bigint,
  char,
  check,
  datetime,
  index,
  int,
  mysqlTable,
  smallint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const programs = mysqlTable(
  'prg_programs',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    programNumber: bigint('program_number', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sigla: varchar('sigla', { length: 20 }).notNull(),
    director: varchar('director', { length: 255 }),
    generalCharacteristics: varchar('general_characteristics', { length: 2000 }),
    logoKey: varchar('logo_key', { length: 512 }),
    status: varchar('status', { length: 16 }).notNull(),
    version: int('version').notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    check('prg_programs_status_chk', sql`${t.status} IN ('ATIVO','INATIVO')`),
    check('prg_programs_version_positive_chk', sql`${t.version} >= 1`),
    uniqueIndex('prg_programs_number_uq').on(t.programNumber),
    uniqueIndex('prg_programs_sigla_uq').on(t.sigla),
    index('prg_programs_status_idx').on(t.status),
    index('prg_programs_name_idx').on(t.name),
  ],
);

export const prgOutbox = mysqlTable(
  'prg_outbox',
  {
    eventId: char('event_id', { length: 36 }).primaryKey().notNull(),
    aggregateId: char('aggregate_id', { length: 36 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    attempts: smallint('attempts').notNull().default(0),
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    check('prg_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    check('prg_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    check('prg_outbox_aggregate_type_chk', sql`${t.aggregateType} IN ('Program')`),
    index('prg_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    index('prg_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);
