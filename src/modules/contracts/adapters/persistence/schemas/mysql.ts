// Schema MySQL — alinhado com ADR-0020 (MySQL como único dialeto).
// Tipos: varchar/bigint/datetime(3)/date. Sem JSON, sem ENUM, sem AUTO_INCREMENT.
// Money cents: `bigint`. Instantes: `datetime(3)`. Datas-calendário (vigência,
// prazo de aditivo): `date` — VO PlainDate (inquiry 0020). Period decomposto em colunas.
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
  boolean,
  char,
  check,
  date,
  datetime,
  foreignKey,
  index,
  mysqlTable,
  primaryKey,
  smallint,
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
    // ADR-0023: NULL em contrato `Pending` (sem assinatura).
    signedAt: datetime('signed_at', { mode: 'date', fsp: 3 }),
    originalValueCents: bigint('original_value_cents', { mode: 'number' }).notNull(),
    originalPeriodKind: varchar('original_period_kind', { length: 16 }).notNull(),
    originalPeriodStart: date('original_period_start', { mode: 'date' }).notNull(),
    originalPeriodEnd: date('original_period_end', { mode: 'date' }),
    // ADR-0023: vigência efetiva NULL em `Pending` (derivada só a partir de Active).
    currentValueCents: bigint('current_value_cents', { mode: 'number' }),
    currentPeriodKind: varchar('current_period_kind', { length: 16 }),
    currentPeriodStart: date('current_period_start', { mode: 'date' }),
    currentPeriodEnd: date('current_period_end', { mode: 'date' }),
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
    check(
      'ctr_contracts_status_chk',
      sql`${t.status} IN ('Pending','Active','Expired','Terminated')`,
    ),

    // ADR-0023: bicondicional `Pending ⟺ sem vigência efetiva`. Pendente tem
    // assinatura e estado vigente NULL; os demais estados têm ambos preenchidos.
    // Espelha o CHECK F-L1 de `ended_at` (`=` entre booleans = bicondicional).
    check(
      'ctr_contracts_pending_consistency_chk',
      sql`(${t.status} = 'Pending') = (${t.signedAt} IS NULL AND ${t.currentValueCents} IS NULL AND ${t.currentPeriodKind} IS NULL AND ${t.currentPeriodStart} IS NULL)`,
    ),

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
    newEndDate: date('new_end_date', { mode: 'date' }),
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

// ─────────────────────────────────────────────────────────────────────────────
// Outbox Pattern (ADR-0015) — Ticket #1 da série CTR-OUTBOX-SCHEMA
//
// CHARSET/COLLATE: aplicar manualmente na migration gerada — mesma regra
// descrita no cabeçalho acima §"CHARSET/COLLATE".
// ─────────────────────────────────────────────────────────────────────────────

// ─── ctr_outbox — eventos pendentes/em processamento ─────────────────────────
//
// Fluxo: `repo.save(aggregate, events)` insere nesta tabela atomicamente com
// o estado do agregado (ADR-0015 §"Fluxo"). Worker lê WHERE processed_at IS NULL
// ORDER BY occurred_at LIMIT N FOR UPDATE SKIP LOCKED.
//
// payload: VARCHAR(8192) serializado (sem JSON nativo — ADR-0020 §"proibido").
//   8 KB cobre events atuais com folga (maior ≈ 500 bytes em ContractStateUpdated).
export const ctrOutbox = mysqlTable(
  'ctr_outbox',
  {
    // UUID v4 do evento — gerado pelo domínio antes do INSERT.
    eventId: char('event_id', { length: 36 }).primaryKey().notNull(),
    // ContractId ou AmendmentId (UUID v4).
    aggregateId: char('aggregate_id', { length: 36 }).notNull(),
    // 'Contract' | 'Amendment' — controlado por CHECK abaixo.
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    // PascalCase EN: ContractCreated, ContractStateUpdated, AmendmentHomologated, …
    eventType: varchar('event_type', { length: 64 }).notNull(),
    // Versão do contrato do payload (inicia em 1).
    schemaVersion: smallint('schema_version').notNull(),
    // Timestamp do domain event (moment em que ocorreu no domínio).
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do INSERT na outbox (audit trail).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // NULL = pendente; NOT NULL = worker marcou após delivery OK.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Número de tentativas de entrega. Default 0; incrementado pelo worker.
    attempts: smallint('attempts').notNull().default(0),
    // Payload serializado do evento — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    // CHECK attempts >= 0 — defesa em profundidade; domínio já garante.
    check('ctr_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    // CHECK event_type não-vazio — domínio usa PascalCase sem espaço.
    check('ctr_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    // CHECK aggregate_type restrito ao catálogo do módulo Contratos.
    // 'Document' adicionado em CTR-DOCUMENT-AGGREGATE-PERSISTENCE.
    check(
      'ctr_outbox_aggregate_type_chk',
      sql`${t.aggregateType} IN ('Contract', 'Amendment', 'Document')`,
    ),
    // Índice composto (ADR-0015 §"Sobre o índice"):
    //   processed_at PRIMEIRO → NULLs agrupados → worker faz range scan eficiente.
    //   Query canônica: WHERE processed_at IS NULL ORDER BY occurred_at LIMIT N.
    index('ctr_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    // Índice por agregado — suporta auditoria "todos os eventos de contrato X".
    index('ctr_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

// ─── ctr_outbox_dead_letter — eventos que falharam N tentativas ───────────────
//
// O worker move para cá quando `attempts >= MAX_ATTEMPTS`. A row é uma cópia
// da outbox original + `failed_at` + `last_error`.
// Sem FK com `ctr_outbox` — a row original pode ser apagada da outbox.
export const ctrOutboxDeadLetter = mysqlTable(
  'ctr_outbox_dead_letter',
  {
    eventId: char('event_id', { length: 36 }).primaryKey().notNull(),
    aggregateId: char('aggregate_id', { length: 36 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Copiado da outbox original (audit: quando foi enfileirado inicialmente).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do roteamento para dead letter (quando MAX_ATTEMPTS foi atingido).
    failedAt: datetime('failed_at', { mode: 'date', fsp: 3 }).notNull(),
    // Número total de tentativas realizadas antes do descarte.
    attempts: smallint('attempts').notNull(),
    // Tag + payload do erro tagged (ex.: 'max-retries-exceeded: ...').
    lastError: varchar('last_error', { length: 2048 }).notNull(),
    // Payload copiado da outbox original — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    // Mesma restrição de aggregate_type da tabela principal.
    // 'Document' adicionado em CTR-DOCUMENT-AGGREGATE-PERSISTENCE.
    check(
      'ctr_outbox_dlq_aggregate_type_chk',
      sql`${t.aggregateType} IN ('Contract', 'Amendment', 'Document')`,
    ),
    // Índice por failed_at — suporta monitoramento "eventos mortos nos últimos N dias".
    index('ctr_outbox_dlq_failed_at_idx').on(t.failedAt),
  ],
);

// ─── eventos_processados — idempotência do consumer ───────────────────────────
//
// Nota linguística: nome PT-BR é exceção justificada por ADR-0015 §"Idempotência".
// ctr_documents — agregado DocumentoContratual (CTR-DOCUMENT-AGGREGATE).
//
// Parent polimórfico: parent_type ∈ {Contract, Amendment} + parent_id (sem FK,
// convenção do projeto). Status reservado com 3 valores (Active hoje;
// LogicallyDeleted/Superseded entram em tickets de lifecycle futuro).
// Categoria via CHECK constraint (ADR-0020 §"sem ENUM").
export const ctrDocuments = mysqlTable(
  'ctr_documents',
  {
    id: char('id', { length: 36 }).primaryKey().notNull(),
    parentType: varchar('parent_type', { length: 16 }).notNull(),
    parentId: char('parent_id', { length: 36 }).notNull(),
    categoria: varchar('categoria', { length: 32 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    hashSha256: char('hash_sha256', { length: 64 }).notNull(),
    bucket: varchar('bucket', { length: 63 }).notNull(),
    storageKey: varchar('storage_key', { length: 1024 }).notNull(),
    signedElectronically: boolean('signed_electronically').notNull().default(false),
    version: smallint('version', { unsigned: true }).notNull().default(1),
    uploadedAt: datetime('uploaded_at', { mode: 'date', fsp: 3 }).notNull(),
    uploadedBy: char('uploaded_by', { length: 36 }).notNull(),
    retentionUntil: datetime('retention_until', { mode: 'date', fsp: 3 }),
    status: varchar('status', { length: 16 }).notNull().default('Active'),
    // CTR-USECASE-DELETE-DOCUMENT: campos audit de exclusao logica (RN-11).
    deletedAt: datetime('deleted_at', { mode: 'date', fsp: 3 }),
    deletedBy: char('deleted_by', { length: 36 }),
    deletedReason: varchar('deleted_reason', { length: 500 }),
    // CTR-USECASE-SUPERSEDE-DOCUMENT: campos audit de substituicao (RN-AS-02).
    supersededAt: datetime('superseded_at', { mode: 'date', fsp: 3 }),
    supersededBy: char('superseded_by', { length: 36 }),
    supersededByDocumentId: char('superseded_by_document_id', { length: 36 }),
  },
  (t) => [
    check('ctr_documents_parent_type_chk', sql`${t.parentType} IN ('Contract','Amendment')`),
    check(
      'ctr_documents_status_chk',
      sql`${t.status} IN ('Active','LogicallyDeleted','Superseded')`,
    ),
    check(
      'ctr_documents_categoria_chk',
      sql`${t.categoria} IN ('signed_contract','signed_amendment','opinion','certificate','justification','technical_attachment','publication','other')`,
    ),
    check('ctr_documents_size_chk', sql`${t.sizeBytes} >= 0`),
    check('ctr_documents_version_chk', sql`${t.version} >= 1`),
    // CTR-USECASE-DELETE-DOCUMENT: consistencia status='LogicallyDeleted' <=> 3 campos preenchidos.
    check(
      'ctr_documents_logically_deleted_chk',
      sql`${t.status} <> 'LogicallyDeleted'
          OR (${t.deletedAt} IS NOT NULL AND ${t.deletedBy} IS NOT NULL AND ${t.deletedReason} IS NOT NULL)`,
    ),
    // CTR-USECASE-SUPERSEDE-DOCUMENT: consistencia status='Superseded' <=> 3 campos preenchidos.
    check(
      'ctr_documents_superseded_chk',
      sql`${t.status} <> 'Superseded'
          OR (${t.supersededAt} IS NOT NULL
              AND ${t.supersededBy} IS NOT NULL
              AND ${t.supersededByDocumentId} IS NOT NULL)`,
    ),
    // Lookup principal: documentos por contrato/aditivo (RN-01: vínculo formal).
    index('ctr_documents_parent_idx').on(t.parentType, t.parentId),
    // Dedup / busca por integridade (RN-AS-02).
    index('ctr_documents_hash_idx').on(t.hashSha256),
    // Listagem temporal de ativos.
    index('ctr_documents_status_uploaded_idx').on(t.status, t.uploadedAt),
  ],
);

// Tabela cross-módulo (sem prefix `ctr_*` — ADR-0014 §"Exceção linguística").
//
// Consumer verifica event_id antes de processar. Se presente → ignorar.
// INSERT feito na mesma transação que o processamento do evento (idempotência).
export const eventosProcessados = mysqlTable(
  'eventos_processados',
  {
    // Identificador do consumidor (ex.: 'logger-default', 'financial-module').
    consumerId: varchar('consumer_id', { length: 64 }).notNull(),
    // UUID v4 do evento (não é FK — tabela cross-módulo sem acoplamento direto).
    eventId: char('event_id', { length: 36 }).notNull(),
    // Timestamp de quando este consumer processou o evento.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // PK composta: cada consumer registra o event_id independentemente.
    primaryKey({ columns: [t.consumerId, t.eventId] }),
    // Índice temporal — suporta auditoria "eventos processados nas últimas N horas".
    index('eventos_processados_processed_at_idx').on(t.processedAt),
  ],
);
