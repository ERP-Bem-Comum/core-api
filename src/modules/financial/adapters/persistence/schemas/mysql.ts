// Schema MySQL do módulo Financial — alinhado com ADR-0020 (MySQL único dialeto).
//
// Convenção de nomes (ADR-0020 §"Convenção"):
//   - Tabelas:  prefixo `fin_*`          (ADR-0014 — isolamento por prefixo)
//   - Índices:  `fin_<tabela>_<col>_idx`
//   - FKs:      `fin_<tabela>_<col>_fk`
//   - CHECKs:   `fin_<tabela>_<desc>_chk`
//
// Mapeamentos canônicos (ADR-0018 + ADR-0020):
//   - UUID v4     → varchar(36)                (PK de domínio — sem AUTO_INCREMENT)
//   - Money       → bigint(mode:'number')       (centavos; sem decimal, sem JSON)
//   - Instantes   → datetime(mode:'date',fsp:3) (sem timestamp — TZ implícito do MySQL)
//   - Datas       → date(mode:'date')           (dueDate — sem hora)
//   - Enums       → varchar(N) + CHECK          (mysqlEnum proibido — ADR-0018 §"Features proibidas")
//   - JSON        → proibido (ADR-0020)
//
// ⚠️ CHARSET/COLLATE — Drizzle 0.45.x não expõe charset/collate table-level.
//    Inserir MANUALMENTE na migration gerada:
//      - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//      - Colunas UUID (id / FKs): COLLATE utf8mb4_bin (comparação binária; mais rápida)
//    Igual ao procedimento descrito em `contracts/adapters/persistence/schemas/mysql.ts` §"CHARSET/COLLATE".
//
// Relacionamento das tabelas (data-model.md §"Visão geral"):
//   fin_documents (raiz)
//   ├── 1—N fin_payables         FK ON DELETE CASCADE
//   ├── 1—N fin_retentions       FK ON DELETE CASCADE
//   └── 1—N fin_registered_taxes FK ON DELETE CASCADE
//   (fin_document_timeline e fin_timeline_field_changes são read-model futuro — NÃO incluídas nesta fatia)
//
// DELETE CASCADE: autorizado em DDD por ser hard-delete dentro do AGGREGATE BOUNDARY
//   (Evans, domain-driven-design.md §"A delete operation must remove everything within the
//    AGGREGATE boundary at once" — data-model.md cita explicitamente esta justificativa).

import {
  bigint,
  boolean,
  check,
  date,
  datetime,
  foreignKey,
  index,
  int,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── fin_documents ────────────────────────────────────────────────────────────
//
// Raiz do agregado Document. Persiste todos os estados: Draft / Open / Approved.
// `version` implementa optimistic lock (R5 do spec): UPDATE WHERE id=? AND version=?;
// incrementado no save. `net_value` é derivado (domínio calcula); gravado para evitar
// recalcular na leitura e para integridade do outbox (ADR-0015).
//
// Índices justificados por queries do repo:
//   - supplier_ref_idx: findBy supplier (relatórios por fornecedor)
//   - status_idx:       findBy status (filtros de dashboard — "Open", "Approved" etc.)
//   - due_date_idx:     findBy dueDate (agenda de vencimentos — queries temporais)
//   - doc_number_idx:   findBy documentNumber (busca fiscal)
export const finDocuments = mysqlTable(
  'fin_documents',
  {
    // PK: UUID v4 gerado pelo domínio (ADR-0020 §"sem AUTO_INCREMENT em PK de domínio").
    id: varchar('id', { length: 36 }).primaryKey().notNull(),

    // Número fiscal (input do usuário — ex.: "NFS 1234"). Nullable: Draft pode não tê-lo.
    documentNumber: varchar('document_number', { length: 60 }),

    // Série fiscal (campo opcional em NFS-e e DANFE; null nos demais).
    series: varchar('series', { length: 20 }),

    // Tipo do documento. CHECK = defesa em profundidade (domínio já valida; ADR-0018 §"sem ENUM").
    // Valor null permitido em Draft (todos os campos opcionais — domain/document/types.ts §DraftDocument).
    type: varchar('type', { length: 16 }),

    // Ref ao fornecedor (cross-módulo partners). Sem FK física (ADR-0014 §cross-módulo sem acoplamento direto).
    supplierRef: varchar('supplier_ref', { length: 36 }),

    // Refs cruzadas opcionais (cross-BC — ADR-0014): sem FK física.
    contractRef: varchar('contract_ref', { length: 36 }),
    budgetPlanRef: varchar('budget_plan_ref', { length: 36 }),
    categoryRef: varchar('category_ref', { length: 36 }),
    programRef: varchar('program_ref', { length: 36 }),

    // Método de pagamento. CHECK = enum de domínio (8 valores — domain/document/types.ts §PaymentMethod).
    paymentMethod: varchar('payment_method', { length: 24 }),

    // Valores monetários em centavos (ADR-0018 §"Money cents: bigint").
    // Nullable em Draft (campo opcional — DraftDocument).
    grossValue: bigint('gross_value', { mode: 'number' }),
    sourceDiscounts: bigint('source_discounts', { mode: 'number' }).notNull().default(0),
    discounts: bigint('discounts', { mode: 'number' }).notNull().default(0),
    penalty: bigint('penalty', { mode: 'number' }).notNull().default(0),
    interest: bigint('interest', { mode: 'number' }).notNull().default(0),

    // Líquido derivado (computeNetValue no domínio): gravado para evitar recalcular na leitura.
    // Nullable em Draft (sem validação plena).
    netValue: bigint('net_value', { mode: 'number' }),

    // Status (7 valores — ADR-0005; só Draft/Open/Approved têm transição nesta fatia).
    // varchar + CHECK (mysqlEnum proibido — ADR-0018/0020).
    status: varchar('status', { length: 16 }).notNull(),

    // Descrição editável (opcional).
    description: varchar('description', { length: 500 }),

    // Data de vencimento (obrigatório a partir de Open; nullable em Draft).
    dueDate: date('due_date', { mode: 'date' }),

    // Metadados de origem OCR (R-OCR).
    readByOcr: boolean('read_by_ocr').notNull().default(false),
    ocrOriginalValue: bigint('ocr_original_value', { mode: 'number' }),
    divergenceDetected: boolean('divergence_detected').notNull().default(false),

    // Optimistic lock (R5): versão do agregado. O repo incrementa no save.
    version: int('version').notNull().default(0),

    // Audit timestamps. createdAt obrigatório; approvedAt/approvedBy apenas em Approved.
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    approvedAt: datetime('approved_at', { mode: 'date', fsp: 3 }),

    // Ref ao aprovador (cross-BC — sem FK física). Preenchido somente em Approved.
    approvedBy: varchar('approved_by', { length: 36 }),
  },
  (t) => [
    // CHECKs de domínio (defesa em profundidade — ADR-0018 §"Features proibidas"):
    check(
      'fin_documents_type_chk',
      sql`${t.type} IS NULL OR ${t.type} IN ('NFS-e','DANFE','RPA','Fatura','Boleto','Recibo','Imposto')`,
    ),
    check(
      'fin_documents_payment_method_chk',
      sql`${t.paymentMethod} IS NULL OR ${t.paymentMethod} IN ('TED','TransferenciaBancaria','PIX','Boleto','CartaoCorporativo','Cambio','GuiaRecolhimento','Outro')`,
    ),
    check(
      'fin_documents_status_chk',
      sql`${t.status} IN ('Draft','Open','Approved','Transmitted','Refused','Paid','Reconciled')`,
    ),
    // Consistência monetária: valores >= 0 (domain/kernel/money.ts rejeita negativos; defesa).
    check('fin_documents_gross_value_chk', sql`${t.grossValue} IS NULL OR ${t.grossValue} >= 0`),
    check('fin_documents_net_value_chk', sql`${t.netValue} IS NULL OR ${t.netValue} >= 0`),
    check('fin_documents_source_discounts_chk', sql`${t.sourceDiscounts} >= 0`),
    check('fin_documents_discounts_chk', sql`${t.discounts} >= 0`),
    check('fin_documents_penalty_chk', sql`${t.penalty} >= 0`),
    check('fin_documents_interest_chk', sql`${t.interest} >= 0`),
    // Optimistic lock: versão nunca negativa.
    check('fin_documents_version_chk', sql`${t.version} >= 0`),

    // Índices (data-model.md §"Índices"):
    // supplier_ref: query "documentos por fornecedor" (relatório de contas a pagar).
    index('fin_documents_supplier_ref_idx').on(t.supplierRef),
    // status: query "documentos abertos/aprovados" (dashboard).
    index('fin_documents_status_idx').on(t.status),
    // due_date: query "vencimentos na semana" (agenda).
    index('fin_documents_due_date_idx').on(t.dueDate),
    // document_number: busca por nota fiscal / nº do documento.
    index('fin_documents_doc_number_idx').on(t.documentNumber),
  ],
);

// ─── fin_payables ─────────────────────────────────────────────────────────────
//
// Títulos financeiros (Pai + Filhos). Filhos gerados por retenção (ISS/IRRF/INSS/CSRF).
// Pai = valor líquido do documento; Filho = valor da retenção.
// FK ON DELETE CASCADE — títulos são parte do AGGREGATE BOUNDARY (Evans; data-model.md).
//
// Índices:
//   - document_id_idx: findPayablesByDocumentId (reconstrução do agregado no findById)
//   - status_idx:      filtros de status de titulo (agenda de pagamentos)
export const finPayables = mysqlTable(
  'fin_payables',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),

    // FK para o documento dono (ON DELETE CASCADE — hard delete de todo o boundary).
    documentId: varchar('document_id', { length: 36 }).notNull(),

    // Tipo do título (Pai ou Filho).
    kind: varchar('kind', { length: 8 }).notNull(),

    // Só preenchido em Child (qual retenção originou o filho).
    retentionType: varchar('retention_type', { length: 8 }),

    // Status espelha o documento nesta fatia (7 valores — domain/document/types.ts §DocumentStatus).
    status: varchar('status', { length: 16 }).notNull(),

    // Valor em centavos (Money — ADR-0018 §"Money cents").
    value: bigint('value', { mode: 'number' }).notNull(),

    // Data de vencimento do título.
    dueDate: date('due_date', { mode: 'date' }).notNull(),

    // Método de pagamento herdado do documento.
    paymentMethod: varchar('payment_method', { length: 24 }).notNull(),

    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // CHECKs (defesa em profundidade):
    check('fin_payables_kind_chk', sql`${t.kind} IN ('Parent','Child')`),
    check(
      'fin_payables_retention_type_chk',
      sql`${t.retentionType} IS NULL OR ${t.retentionType} IN ('ISS','IRRF','INSS','CSRF')`,
    ),
    check(
      'fin_payables_status_chk',
      sql`${t.status} IN ('Draft','Open','Approved','Transmitted','Refused','Paid','Reconciled')`,
    ),
    check(
      'fin_payables_payment_method_chk',
      sql`${t.paymentMethod} IN ('TED','TransferenciaBancaria','PIX','Boleto','CartaoCorporativo','Cambio','GuiaRecolhimento','Outro')`,
    ),
    check('fin_payables_value_chk', sql`${t.value} >= 0`),
    // Child deve ter retentionType preenchido; Parent deve ter retentionType NULL.
    check(
      'fin_payables_child_retention_chk',
      sql`(${t.kind} = 'Child') = (${t.retentionType} IS NOT NULL)`,
    ),

    // FK intra-módulo (ON DELETE CASCADE — boundary do agregado).
    foreignKey({
      name: 'fin_payables_document_id_fk',
      columns: [t.documentId],
      foreignColumns: [finDocuments.id],
    }).onDelete('cascade'),

    // Índice: reconstrução do agregado no findById (1+1 queries — evita N+1).
    index('fin_payables_document_id_idx').on(t.documentId),
    // Índice: agenda de pagamentos por status.
    index('fin_payables_status_idx').on(t.status),
  ],
);

// ─── fin_retentions ───────────────────────────────────────────────────────────
//
// Retenções que GERAM título filho e ABATEM o líquido (ISS/IRRF/INSS/CSRF).
// `rate_bps` = alíquota em basis points (inteiro — evita float no domínio e no banco).
// FK ON DELETE CASCADE — retenções são parte do AGGREGATE BOUNDARY.
//
// Sem id de payable: a retenção é a "regra de negócio" que originou o filho;
// o filho em si está em fin_payables. O mapper reconstrói a retenção a partir daqui
// e a lista dos filhos a partir de fin_payables (retentionType != null).
//
// Índice:
//   - document_id_idx: findRetentionsByDocumentId (reconstrução do agregado)
export const finRetentions = mysqlTable(
  'fin_retentions',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),

    // Tipo de retenção (4 valores — domain/shared/retention.ts §RetentionType).
    type: varchar('type', { length: 8 }).notNull(),

    // Base de cálculo em centavos.
    base: bigint('base', { mode: 'number' }).notNull(),

    // Alíquota em basis points (ex.: 1100 = 11%) — inteiro, evita float (data-model.md).
    rateBps: int('rate_bps').notNull(),

    // Valor da retenção em centavos.
    value: bigint('value', { mode: 'number' }).notNull(),
  },
  (t) => [
    check('fin_retentions_type_chk', sql`${t.type} IN ('ISS','IRRF','INSS','CSRF')`),
    check('fin_retentions_base_chk', sql`${t.base} >= 0`),
    check('fin_retentions_rate_bps_chk', sql`${t.rateBps} >= 0`),
    check('fin_retentions_value_chk', sql`${t.value} >= 0`),

    foreignKey({
      name: 'fin_retentions_document_id_fk',
      columns: [t.documentId],
      foreignColumns: [finDocuments.id],
    }).onDelete('cascade'),

    index('fin_retentions_document_id_idx').on(t.documentId),
  ],
);

// ─── fin_registered_taxes ─────────────────────────────────────────────────────
//
// Impostos registrados (apenas leitura — R1/R9). NÃO geram filho, NÃO abatem o líquido.
// Inclui impostos da Reforma Tributária (CBS, IBS Municipal, IBS Estadual).
// FK ON DELETE CASCADE — parte do AGGREGATE BOUNDARY.
//
// Índice:
//   - document_id_idx: findRegisteredTaxesByDocumentId (reconstrução do agregado)
export const finRegisteredTaxes = mysqlTable(
  'fin_registered_taxes',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),

    // Tipo do imposto (7 valores — domain/shared/registered-tax.ts §RegisteredTaxType).
    // varchar(16) pois 'IBS_Municipal' tem 13 chars.
    type: varchar('type', { length: 16 }).notNull(),

    base: bigint('base', { mode: 'number' }).notNull(),
    rateBps: int('rate_bps').notNull(),
    value: bigint('value', { mode: 'number' }).notNull(),
  },
  (t) => [
    check(
      'fin_registered_taxes_type_chk',
      sql`${t.type} IN ('ICMS','IPI','PIS','COFINS','CBS','IBS_Municipal','IBS_Estadual')`,
    ),
    check('fin_registered_taxes_base_chk', sql`${t.base} >= 0`),
    check('fin_registered_taxes_rate_bps_chk', sql`${t.rateBps} >= 0`),
    check('fin_registered_taxes_value_chk', sql`${t.value} >= 0`),

    foreignKey({
      name: 'fin_registered_taxes_document_id_fk',
      columns: [t.documentId],
      foreignColumns: [finDocuments.id],
    }).onDelete('cascade'),

    index('fin_registered_taxes_document_id_idx').on(t.documentId),
  ],
);

// ─── Tipos gerados pelo schema (consumidos pelos mappers) ─────────────────────
//
// `$inferSelect` = shape da row lida do banco (SELECT *).
// `$inferInsert` = shape para INSERT/UPDATE. Usado nos mappers para garantir
// que o TS capture qualquer coluna nova adicionada ao schema.
// Padrão: `drizzle-schema-author SKILL.md §"Workflow passo 6"`.

export type DocumentRow = typeof finDocuments.$inferSelect;
export type NewDocumentRow = typeof finDocuments.$inferInsert;

export type PayableRow = typeof finPayables.$inferSelect;
export type NewPayableRow = typeof finPayables.$inferInsert;

export type RetentionRow = typeof finRetentions.$inferSelect;
export type NewRetentionRow = typeof finRetentions.$inferInsert;

export type RegisteredTaxRow = typeof finRegisteredTaxes.$inferSelect;
export type NewRegisteredTaxRow = typeof finRegisteredTaxes.$inferInsert;
