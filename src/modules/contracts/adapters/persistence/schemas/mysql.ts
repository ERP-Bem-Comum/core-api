// Schema MySQL — alinhado com ADR-0020 (MySQL como único dialeto).
// Tipos: varchar/bigint/datetime(3). Sem JSON, sem ENUM, sem AUTO_INCREMENT.
// Money cents: `bigint`. Dates: `datetime(3)`. Period decomposto em 3 colunas.
//
// Convenção de nomenclatura (ADR-0020 §"Convenção"):
//   - Tabelas: prefixo `ctr_*` dentro do database `core` — torna o owner
//     explícito mesmo em listagens `SHOW TABLES`.
//   - CHECKs: herdam o prefix da tabela (`ctr_<tabela>_<descrição>_chk`).
//   - Índices: herdam o prefix (`ctr_<tabela>_<coluna>_idx`).
//
// Índices declarados:
//   - F-H2: amendments.contract_id (FK index, evita full table scan)
//   - F-M2: contracts.status (queries "contratos ativos")
//   - F-M2: contracts.signed_at (queries temporais)
//
// CHECK constraints adicionais (invariantes do domínio):
//   - F-L1: endedAt IS NOT NULL ⟺ status IN ('Expired','Terminated')
//   - F-L2: status='Homologated' ⟹ homologatedAt + homologatedBy + signedDocumentRef
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual (CTR-DB-SCHEMA-HARDENING — audit §M1)
// =============================================================================
// `drizzle-orm@0.45.x` NÃO expõe `charset`/`collate` na API table-level (verificado
// em `node_modules/.../mysql-core/table.d.ts`). Aplicamos em SQL puro na migration
// `0000_*.sql`:
//   - Por tabela: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//                 (alinhado ADR-0014 server-default; vence audit `0002` §M1).
//   - Em UUIDs (`id`, `contract_id`, `amendment_id`, `signed_document_ref`,
//                `homologated_by`): `COLLATE utf8mb4_bin` — comparação binária,
//                ~mais rápida e elimina drift Unicode em FK matches.
//
// **RESPONSABILIDADE DO PRÓXIMO DEV**: se `drizzle-kit generate` emitir uma
// migration 0001+, edite o SQL gerado para inserir `ENGINE=InnoDB DEFAULT
// CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em qualquer CREATE TABLE novo, e
// `COLLATE utf8mb4_bin` em qualquer coluna UUID nova. Os testes em
// `schema-hardening.test.ts` (CA-15/16) cobrem `0000_*.sql` apenas — estender
// para novas migrations conforme aparecerem.
//
// IMPORTANTE: este schema está DEFINIDO mas o driver MySQL não está wired.
// Será ativado em CTR-DB-DRIVER-MYSQL (ticket #4 do ADR-0020).

import {
  bigint,
  check,
  datetime,
  foreignKey,
  index,
  mysqlTable,
  primaryKey,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const contracts = mysqlTable(
  'ctr_contracts',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    sequentialNumber: varchar('sequential_number', { length: 16 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    objective: varchar('objective', { length: 1000 }).notNull(),
    signedAt: datetime('signed_at', { mode: 'date', fsp: 3 }).notNull(),
    originalValueCents: bigint('original_value_cents', { mode: 'number' }).notNull(),
    originalPeriodKind: varchar('original_period_kind', { length: 16 }).notNull(),
    originalPeriodStart: datetime('original_period_start', { mode: 'date', fsp: 3 }).notNull(),
    originalPeriodEnd: datetime('original_period_end', { mode: 'date', fsp: 3 }),
    currentValueCents: bigint('current_value_cents', { mode: 'number' }).notNull(),
    currentPeriodKind: varchar('current_period_kind', { length: 16 }).notNull(),
    currentPeriodStart: datetime('current_period_start', { mode: 'date', fsp: 3 }).notNull(),
    currentPeriodEnd: datetime('current_period_end', { mode: 'date', fsp: 3 }),
    status: varchar('status', { length: 16 }).notNull(),
    endedAt: datetime('ended_at', { mode: 'date', fsp: 3 }),
  },
  (t) => [
    // CHECKs de domínio (enums via varchar+CHECK — ADR-0018 §"Features proibidas" baniu ENUM nativo)
    check(
      'ctr_contracts_original_period_kind_chk',
      sql`${t.originalPeriodKind} IN ('Fixed','Indefinite')`,
    ),
    check(
      'ctr_contracts_current_period_kind_chk',
      sql`${t.currentPeriodKind} IN ('Fixed','Indefinite')`,
    ),
    check('ctr_contracts_status_chk', sql`${t.status} IN ('Active','Expired','Terminated')`),

    // F-L1: bicondicional entre status terminado e endedAt populado.
    // `(A) = (B)` em MySQL retorna 1 se ambos true ou ambos false.
    // Tanto `expire()` quanto `terminate()` no domínio populam `endedAt` —
    // por isso o RHS inclui as duas variantes.
    //
    // Trade-off de leitura (suggestion #3 do W2 review): a alternativa explícita
    //   (status='Active' AND endedAt IS NULL)
    //     OR (status IN ('Expired','Terminated') AND endedAt IS NOT NULL)
    // é mais verbosa mas equivalente. Mantemos `=` por ser compacto e
    // MySQL-idiomático (= entre booleans = bicondicional).
    check(
      'ctr_contracts_ended_at_consistency_chk',
      sql`(${t.endedAt} IS NOT NULL) = (${t.status} IN ('Expired','Terminated'))`,
    ),

    // Índices (F-M2 do DB audit): suporta dashboards de "contratos ativos" e
    // relatórios temporais sem full table scan (Ramakrishnan §8.2).
    index('ctr_contracts_status_idx').on(t.status),
    index('ctr_contracts_signed_at_idx').on(t.signedAt),
  ],
);

export const amendments = mysqlTable(
  'ctr_amendments',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // FK declarada table-level abaixo (`ctr_amend_contract_fk`) — audit §L2
    // renomeou o nome default de 47 chars para 21 chars.
    contractId: varchar('contract_id', { length: 36 }).notNull(),
    amendmentNumber: varchar('amendment_number', { length: 32 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    kind: varchar('kind', { length: 16 }).notNull(),
    impactValueCents: bigint('impact_value_cents', { mode: 'number' }),
    newEndDate: datetime('new_end_date', { mode: 'date', fsp: 3 }),
    status: varchar('status', { length: 16 }).notNull(),
    signedDocumentRef: varchar('signed_document_ref', { length: 36 }),
    homologatedAt: datetime('homologated_at', { mode: 'date', fsp: 3 }),
    homologatedBy: varchar('homologated_by', { length: 36 }),
  },
  (t) => [
    // CHECKs de domínio (enums)
    check(
      'ctr_amendments_kind_chk',
      sql`${t.kind} IN ('Addition','Suppression','TermChange','Misc')`,
    ),
    check('ctr_amendments_status_chk', sql`${t.status} IN ('Pending','Homologated')`),

    // F-L2: implicação homologation completeness.
    // `status='Homologated' ⟹ (homologatedAt AND homologatedBy AND signedDocumentRef)`
    // expressa via `(NOT P) OR Q` (modus ponens reverso).
    check(
      'ctr_amendments_homologation_completeness_chk',
      sql`
        ${t.status} <> 'Homologated'
        OR (
          ${t.homologatedAt} IS NOT NULL
          AND ${t.homologatedBy} IS NOT NULL
          AND ${t.signedDocumentRef} IS NOT NULL
        )
      `,
    ),

    // Índice F-H2 (Critical do DB audit): MySQL/InnoDB cria automaticamente
    // o índice de FK, mas a declaração explícita garante consistência e fica
    // visível em `getTableConfig` para os testes de schema.
    index('ctr_amendments_contract_id_idx').on(t.contractId),

    // L2 (audit §L2) — FK declarada com nome custom (curto). O nome default
    // gerado por `.references()` seria `ctr_amendments_contract_id_ctr_contracts_id_fk`
    // (47 chars). `ctr_amend_contract_fk` (21 chars) é mais legível em logs e
    // sob `SHOW CREATE TABLE`.
    foreignKey({
      name: 'ctr_amend_contract_fk',
      columns: [t.contractId],
      foreignColumns: [contracts.id],
    }),
  ],
);

export const contractHomologatedAmendments = mysqlTable(
  'ctr_contract_homologated_amendments',
  {
    contractId: varchar('contract_id', { length: 36 }).notNull(),
    amendmentId: varchar('amendment_id', { length: 36 }).notNull(),
  },
  // Nomes de FK explícitos: o nome default gerado pelo drizzle (
  // `<table>_<col>_<reftable>_<refcol>_fk`) ultrapassa os 64 chars do limite
  // MySQL nesta junction table (`ctr_contract_homologated_amendments_*` já
  // tem 36 chars). Encurtamos para `ctr_chom_amends_*_fk` (≤ 30 chars).
  (t) => [
    primaryKey({ columns: [t.contractId, t.amendmentId] }),
    foreignKey({
      name: 'ctr_chom_amends_contract_fk',
      columns: [t.contractId],
      foreignColumns: [contracts.id],
    }),
    foreignKey({
      name: 'ctr_chom_amends_amendment_fk',
      columns: [t.amendmentId],
      foreignColumns: [amendments.id],
    }),
  ],
);
