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
// ⚠️ CHARSET table-level — Drizzle 0.45.x não expõe charset/collate table-level; segue MANUAL na
//    migration gerada: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci.
//
//    A collation das COLUNAS de identificador não é mais manual (#636): vem dos tipos de
//    `shared/persistence/identifier-columns.ts` (comparação binária; mais rápida).
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
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql, type SQL } from 'drizzle-orm';

import {
  objectStorageKey,
  opaqueKey,
  sha256HexKey,
  uuidKey,
} from '#src/shared/persistence/identifier-columns.ts';
import { VAN_STATUS_DETAIL_MAX_LENGTH } from '#src/modules/financial/application/ports/van-status-reader.ts';

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
    id: uuidKey('id').primaryKey().notNull(),

    // Número fiscal (input do usuário — ex.: "NFS 1234"). Nullable: Draft pode não tê-lo.
    documentNumber: varchar('document_number', { length: 60 }),

    // Série fiscal (campo opcional em NFS-e e DANFE; null nos demais).
    series: varchar('series', { length: 20 }),

    // Tipo do documento. CHECK = defesa em profundidade (domínio já valida; ADR-0018 §"sem ENUM").
    // Valor null permitido em Draft (todos os campos opcionais — domain/document/types.ts §DraftDocument).
    type: varchar('type', { length: 16 }),

    // Ref ao favorecido (cross-módulo partners). Sem FK física (ADR-0014 §cross-módulo sem acoplamento direto).
    supplierRef: uuidKey('supplier_ref'),

    // Tipo do favorecido (#90). Nullable: back-compat com documentos pré-#90 (lidos como 'supplier').
    // CHECK = enum de domínio (4 valores — domain/document/types.ts §PayeeKind; ADR-0020 §"sem ENUM").
    payeeKind: varchar('payee_kind', { length: 16 }),

    // Refs cruzadas opcionais (cross-BC — ADR-0014): sem FK física.
    contractRef: uuidKey('contract_ref'),
    budgetPlanRef: uuidKey('budget_plan_ref'),
    categoryRef: uuidKey('category_ref'),
    // Subcategoria = folha da árvore do plano (#502). Soft ref (sem FK — ADR-0014); aditiva/nullable.
    subcategoryRef: uuidKey('subcategory_ref'),
    costCenterRef: uuidKey('cost_center_ref'),
    programRef: uuidKey('program_ref'),

    // Conta-cedente de débito (D-CEDENTE — de qual conta o pagamento sai). Ref lógica a
    // fin_cedente_accounts; sem FK física (ADR-0014 §cross-acoplamento). Nullable até a remessa atribuir.
    debitAccountRef: uuidKey('debit_account_ref'),

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
    status: varchar('status', { length: 24 }).notNull(),

    // Descrição editável (opcional).
    description: varchar('description', { length: 500 }),

    // Data de vencimento (obrigatório a partir de Open; nullable em Draft).
    dueDate: date('due_date', { mode: 'date' }),

    // Data de EMISSÃO (#163) — capturada no create (OCR/manual); nullable (opcional + back-compat).
    issueDate: date('issue_date', { mode: 'date' }),

    // #115: chave de acesso (44 dígitos) da DANFE; null nos demais tipos.
    accessKey: varchar('access_key', { length: 44 }),

    // #197: competência contábil (mês de referência) 'YYYY-MM'; conta-débito reusa debit_account_ref.
    competencia: varchar('competencia', { length: 7 }),

    // #62: comprovante-fonte (PDF/XML lido) guardado no storage — todas nullable (opcional + back-compat).
    sourceFileBucket: varchar('source_file_bucket', { length: 63 }),
    sourceFileKey: varchar('source_file_key', { length: 1024 }),
    sourceFileHashSha256: opaqueKey('source_file_hash_sha256'),
    sourceFileSizeBytes: bigint('source_file_size_bytes', { mode: 'number' }),
    sourceFileMime: varchar('source_file_mime', { length: 127 }),

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
    approvedBy: uuidKey('approved_by'),

    // Aprovador PRETENDIDO definido na inclusão (#148) — cross-BC (auth), sem FK física. Nullable
    // (opcional + back-compat). Distinto de approved_by (efetivado na aprovação).
    approverRef: uuidKey('approver_ref'),

    // #273: complemento da forma de pagamento (texto livre opaco — linha digitável de boleto,
    // id de cartão corporativo, referência de câmbio). Nullable + sem CHECK (string livre).
    // ADR-0018 §"Texto livre curto" → varchar(255). Migration 0026 (ALTER ADD COLUMN, INSTANT).
    paymentDetail: varchar('payment_detail', { length: 255 }),

    // Correlação ETL (ETL-FINANCIAL-WRITER, padrão par_*/auth_user): id do payable no
    // legado. NULL = documento nativo do core-api; não-NULL = migrado. UNIQUE garante
    // idempotência da carga (identifierCode legado NÃO é único: 37 distintos em 52 —
    // por isso a correlação é por legacy_id, nunca por document_number).
    legacyId: int('legacy_id'),
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
      'fin_documents_payee_kind_chk',
      sql`${t.payeeKind} IS NULL OR ${t.payeeKind} IN ('supplier','financier','act','collaborator')`,
    ),
    check(
      'fin_documents_status_chk',
      sql`${t.status} IN ('Draft','Open','Approved','Transmitted','Refused','Paid','PartiallyReconciled','Reconciled')`,
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

    // #62: comprovante-fonte é all-or-nothing (defesa em profundidade — o mapper já reidrata via VO).
    check(
      'fin_documents_source_file_all_or_none_chk',
      sql`(${t.sourceFileBucket} IS NULL AND ${t.sourceFileKey} IS NULL AND ${t.sourceFileHashSha256} IS NULL AND ${t.sourceFileSizeBytes} IS NULL AND ${t.sourceFileMime} IS NULL) OR (${t.sourceFileBucket} IS NOT NULL AND ${t.sourceFileKey} IS NOT NULL AND ${t.sourceFileHashSha256} IS NOT NULL AND ${t.sourceFileSizeBytes} IS NOT NULL AND ${t.sourceFileMime} IS NOT NULL)`,
    ),
    // #62: tamanho do comprovante nunca não-positivo (paridade com as bigint irmãs).
    check(
      'fin_documents_source_file_size_bytes_chk',
      sql`${t.sourceFileSizeBytes} IS NULL OR ${t.sourceFileSizeBytes} > 0`,
    ),

    // Índices (data-model.md §"Índices"):
    // supplier_ref: query "documentos por fornecedor" (relatório de contas a pagar).
    index('fin_documents_supplier_ref_idx').on(t.supplierRef),
    // status: query "documentos abertos/aprovados" (dashboard).
    index('fin_documents_status_idx').on(t.status),
    // due_date: query "vencimentos na semana" (agenda).
    index('fin_documents_due_date_idx').on(t.dueDate),
    // issue_date: filtro por emissão na listagem (#163).
    index('fin_documents_issue_date_idx').on(t.issueDate),
    // document_number: busca por nota fiscal / nº do documento.
    index('fin_documents_doc_number_idx').on(t.documentNumber),
    // Idempotência da ETL (múltiplos NULL convivem no InnoDB — precedente par_*).
    uniqueIndex('fin_documents_legacy_id_uq').on(t.legacyId),
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
    id: uuidKey('id').primaryKey().notNull(),

    // FK para o documento dono (ON DELETE CASCADE — hard delete de todo o boundary).
    documentId: uuidKey('document_id').notNull(),

    // Tipo do título (Pai ou Filho).
    kind: varchar('kind', { length: 8 }).notNull(),

    // Só preenchido em Child (qual retenção originou o filho).
    retentionType: varchar('retention_type', { length: 8 }),

    // Status espelha o documento nesta fatia (7 valores — domain/document/types.ts §DocumentStatus).
    status: varchar('status', { length: 24 }).notNull(),

    // Valor em centavos (Money — ADR-0018 §"Money cents").
    value: bigint('value', { mode: 'number' }).notNull(),

    // Data de vencimento do título.
    dueDate: date('due_date', { mode: 'date' }).notNull(),

    // Forma de pagamento DO TÍTULO. Nasce herdada do documento e diverge a partir daí: retenção é
    // título a pagar, e a guia de recolhimento do imposto não sai pela mesma forma que o líquido.
    paymentMethod: varchar('payment_method', { length: 24 }).notNull(),

    // Complemento da forma DO TÍTULO — código de barras do boleto, da guia. Espelha o comprimento de
    // `fin_documents.payment_detail` (255) porque guarda a mesma natureza de dado; nullable porque a
    // maioria das formas não usa complemento, e porque o título antigo nasce sem ele no backfill.
    paymentDetail: varchar('payment_detail', { length: 255 }),

    // #231: data de pagamento (preenchida na baixa manual); null enquanto não pago.
    paidAt: date('paid_at', { mode: 'date' }),

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
      sql`${t.status} IN ('Draft','Open','Approved','Transmitted','Refused','Paid','PartiallyReconciled','Reconciled')`,
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
    // #383: consistência status/paid_at — todo título 'Paid' tem data de pagamento. O invariante já
    // vale no domínio (payPayableManually seta status+paidAt na mesma cópia); reafirmado no banco
    // como defesa em profundidade contra linha inconsistente vinda de ETL/UPDATE manual.
    check('fin_payables_paid_at_chk', sql`${t.status} <> 'Paid' OR ${t.paidAt} IS NOT NULL`),

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
    id: uuidKey('id').primaryKey().notNull(),
    documentId: uuidKey('document_id').notNull(),

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
    id: uuidKey('id').primaryKey().notNull(),
    documentId: uuidKey('document_id').notNull(),

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

// ─── fin_document_timeline ────────────────────────────────────────────────────
//
// Read-model Time Travel (ADR-0001/010): materializa um marco por evento de domínio.
// Append-only: nenhum UPDATE/DELETE aqui — a única remoção é o CASCADE do cancelamento
// (hard delete de fin_documents → cascateia este tabela → cascateia fin_timeline_field_changes).
//
// Decisão de atomicidade (Vernon:3257 — ADR-0001/010):
//   "update synchronously [...] in the same transaction" — gravado na MESMA transaction
//   do DocumentRepository.save (SC-004/NFR-001: sem janela em que o doc existe sem trilha).
//
// Índices:
//   idx_fin_tl_doc_time (document_id, occurred_at): leitura cronológica GET /timeline
//     — cobertura do JOIN documentId + ordenação occurred_at em uma só varrida de índice.
//   idx_fin_tl_target (target_id): busca de entries por alvo (future query).
//
// CHECKs:
//   ck_fin_tl_target_kind: {Document, Payable} — 8 chars max; defesa em profundidade.
//   ck_fin_tl_event_type: literais EN dos eventos do domínio (domain/document/events.ts).
//
// FK ON DELETE CASCADE: data-model.md §"FK ON DELETE CASCADE" — Evans §"A delete operation
//   must remove everything within the AGGREGATE boundary at once" (data-model.md cita 1471).
//
// ⚠️ CHARSET/COLLATE: inserir manualmente na migration gerada (limitação Drizzle 0.45.x):
//   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci por tabela;
//   COLLATE utf8mb4_bin em colunas UUID (id, document_id, target_id, actor_ref).
export const finDocumentTimeline = mysqlTable(
  'fin_document_timeline',
  {
    // PK: UUID v4 gerado pelo domínio (ADR-0020 §"sem AUTO_INCREMENT em PK de domínio").
    id: uuidKey('id').primaryKey().notNull(),

    // Liga ao evento de domínio que originou o marco (idempotência futura).
    eventId: uuidKey('event_id').notNull(),

    // Agrupa a trilha por documento (mesmo quando target = Payable).
    // FK ON DELETE CASCADE — pertence ao AGGREGATE BOUNDARY do documento.
    documentId: uuidKey('document_id').notNull(),

    // Discriminador do alvo: 'Document' ou 'Payable'. varchar(8) cobre ambos.
    targetKind: varchar('target_kind', { length: 8 }).notNull(),

    // ID do alvo (DocumentId ou PayableId — UUID v4).
    targetId: uuidKey('target_id').notNull(),

    // Tipo do marco: discriminador EN dos eventos de domínio (domain/document/events.ts).
    // varchar(40): 'DocumentDraftSaved' tem 19 chars; margem para future events.
    eventType: varchar('event_type', { length: 40 }).notNull(),

    // Instante do marco: injetado via Clock (never new Date() no domínio).
    // datetime(fsp:3) = milissegundo; mode:'date' = Date nativo (ADR-0020 §"Timestamps").
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),

    // Ref ao autor (cross-BC — sem FK física; ADR-0014). Nullable: FR-005 best-effort.
    actorRef: uuidKey('actor_ref'),
  },
  (t) => [
    // CHECKs de defesa em profundidade (domain valida primeiro):
    check('ck_fin_tl_target_kind', sql`${t.targetKind} IN ('Document','Payable')`),
    check(
      'ck_fin_tl_event_type',
      // #56b: sem 'DocumentCancelled' — inalcançável na trilha (cancelar faz hard-delete + cascade).
      // #223: + 'PayableManuallyPaid' (baixa manual aparece na trilha do operador).
      sql`${t.eventType} IN ('DocumentSaved','PayableApproved','ApprovalUndone','DocumentDraftSaved','PayableManuallyPaid')`,
    ),

    // FK intra-módulo ON DELETE CASCADE: data-model.md §"FK ON DELETE CASCADE".
    foreignKey({
      name: 'fin_document_timeline_document_id_fk',
      columns: [t.documentId],
      foreignColumns: [finDocuments.id],
    }).onDelete('cascade'),

    // Índice composto: leitura cronológica do GET /timeline (document_id + occurred_at).
    // Cobre tanto o filtro (WHERE document_id = ?) quanto a ordenação (ORDER BY occurred_at ASC).
    index('idx_fin_tl_doc_time').on(t.documentId, t.occurredAt),

    // Índice: busca de entries por target_id (query futura de trilha por título).
    index('idx_fin_tl_target').on(t.targetId),
  ],
);

// ─── fin_timeline_field_changes ───────────────────────────────────────────────
//
// Diff decomposto em 1FN (ADR-0020 §"sem JSON nativo"): cada linha é um campo alterado.
// Sem tabela de campo serializado/JSON — cada FieldChange vira uma row atômica.
// `before_value` / `after_value` são `text` nullable: strings serializadas do domínio
// (Money → centavos string; Date → ISO; refs → UUID; status/enum → literal EN).
//
// `text` em vez de `varchar(N)`:
//   - `before_value`/`after_value` podem carregar valores longos (ex.: description até 500 chars).
//   - `text` não entra no prefix-index limit (tabela sem índice nestas colunas — só
//     `timeline_entry_id` é indexado, que é varchar(36)).
//   - `field` permanece `varchar(60)` — nomes de campo de domínio são curtos e determinísticos.
//
// FK ON DELETE CASCADE dupla: documento → entry → changes (cascata dupla).
//
// Índice:
//   idx_fin_tlfc_entry (timeline_entry_id): busca das changes de uma entry (JOIN no mapper).
export const finTimelineFieldChanges = mysqlTable(
  'fin_timeline_field_changes',
  {
    id: uuidKey('id').primaryKey().notNull(),

    // FK para a entry que originou este campo alterado (ON DELETE CASCADE).
    timelineEntryId: uuidKey('timeline_entry_id').notNull(),

    // Nome do campo de domínio (EN): ex. 'grossValue', 'status', 'dueDate'.
    // varchar(60): margem para nomes compostos futuros (ex.: 'paymentMethod').
    field: varchar('field', { length: 60 }).notNull(),

    // Valor anterior serializado (string atômica, 1FN, sem JSON — ADR-0020).
    // null = campo não existia antes (criação do document ou do payable).
    // text: acomoda values longos (description até 500 chars; ADR-0020 §"Texto livre longo").
    beforeValue: text('before_value'),

    // Valor novo serializado. null = campo foi removido (ex.: description apagada).
    afterValue: text('after_value'),
  },
  (t) => [
    // FK intra-módulo ON DELETE CASCADE: cascata dupla (documento → entry → changes).
    foreignKey({
      name: 'fin_timeline_field_changes_entry_id_fk',
      columns: [t.timelineEntryId],
      foreignColumns: [finDocumentTimeline.id],
    }).onDelete('cascade'),

    // Índice: busca de todas as changes de uma entry (JOIN no mapper ao reconstruir a trilha).
    index('idx_fin_tlfc_entry').on(t.timelineEntryId),
  ],
);

// ─── fin_supplier_view ──────────────────────────────────────────────────────────
//
// Read-model de fornecedor (US2 #47 / ADR-0043): cópia local denormalizada
// `supplier_ref → { name, document }`, mantida por eventos do `partners` consumidos do
// `par_outbox` (consistência eventual). NÃO há FK física para o partners (ADR-0014 §cross-módulo
// sem acoplamento direto). `occurred_at` é o guard de recência do upsert (não regride).
// `document` = CNPJ alfanumérico (ADR-0044) — texto.
export const finSupplierView = mysqlTable('fin_supplier_view', {
  // PK = referência do fornecedor no partners (UUID v4). varchar(36), sem AUTO_INCREMENT.
  supplierRef: uuidKey('supplier_ref').primaryKey().notNull(),

  // Snapshot do nome do fornecedor (último evento aplicado).
  name: varchar('name', { length: 255 }).notNull(),

  // CNPJ alfanumérico (ADR-0044) — 14 chars; varchar(20) com folga. Texto, sem máscara.
  document: varchar('document', { length: 20 }).notNull(),

  // Instante do evento de origem — guard de recência (não aplica evento mais antigo).
  occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),

  // Quando a linha foi gravada pelo consumer (auditoria).
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
});

// ─── fin_payable_view ─────────────────────────────────────────────────────────
//
// #235 (FND-RM-a) — read-model de payables do Dashboard/Reports (Camada 0). Projeção
// evento-carregada (ADR-0022) alimentada pelo consumer `payable-view-projection` a partir dos
// eventos enriquecidos do `financial` (DocumentSaved + transições). PK = payableId (UUID v4).
// Sem FK cross-aggregate (refs por identidade). `kind`/`status` = varchar (ENUM proibido, ADR-0020).
export const finPayableView = mysqlTable(
  'fin_payable_view',
  {
    payableId: uuidKey('payable_id').primaryKey().notNull(),
    documentId: uuidKey('document_id').notNull(),
    kind: varchar('kind', { length: 10 }).notNull(), // Parent | Child
    retentionType: varchar('retention_type', { length: 10 }),
    supplierRef: uuidKey('supplier_ref'),
    contractRef: uuidKey('contract_ref'),
    categoryRef: uuidKey('category_ref'),
    // #446 (REP-3 / Slice B): Plano Orçamentário carimbado no documento (#502) — habilita o
    // agrupamento por Plano Orçamentário no REP-3.
    budgetPlanRef: uuidKey('budget_plan_ref'),
    // Subcategoria = folha da árvore do plano (#502). Projeção espelha a ref do documento (S5).
    subcategoryRef: uuidKey('subcategory_ref'),
    costCenterRef: uuidKey('cost_center_ref'),
    programRef: uuidKey('program_ref'),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    status: varchar('status', { length: 12 }).notNull(), // Open|Approved|Paid|Cancelled
    // #239: conta-débito (de qual conta cedente saiu) + data do pagamento (só quando Paid).
    debitAccountRef: uuidKey('debit_account_ref'),
    paidAt: date('paid_at', { mode: 'string' }),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    index('fin_payable_view_status_idx').on(t.status),
    index('fin_payable_view_cost_center_ref_idx').on(t.costCenterRef),
    index('fin_payable_view_category_ref_idx').on(t.categoryRef),
    index('fin_payable_view_budget_plan_ref_idx').on(t.budgetPlanRef),
    index('fin_payable_view_subcategory_ref_idx').on(t.subcategoryRef),
    index('fin_payable_view_program_ref_idx').on(t.programRef),
    index('fin_payable_view_supplier_ref_idx').on(t.supplierRef),
    index('fin_payable_view_due_date_idx').on(t.dueDate),
    // #239: widget "Últimos pagamentos" ordena por paid_at desc.
    index('fin_payable_view_paid_at_idx').on(t.paidAt),
    // Enums de domínio → varchar + CHECK (ADR-0020; mysqlEnum proibido). Espelha fin_payables_*_chk.
    check('fin_payable_view_kind_chk', sql`${t.kind} IN ('Parent','Child')`),
    check(
      'fin_payable_view_status_chk',
      sql`${t.status} IN ('Open','Approved','Paid','Cancelled')`,
    ),
    check(
      'fin_payable_view_retention_type_chk',
      sql`${t.retentionType} IS NULL OR ${t.retentionType} IN ('ISS','IRRF','INSS','CSRF')`,
    ),
  ],
);

export type PayableViewRow = typeof finPayableView.$inferSelect;
export type NewPayableViewRow = typeof finPayableView.$inferInsert;

// ─── fin_cedente_accounts ─────────────────────────────────────────────────────
//
// Conta-cedente: conta-débito Bradesco da organização (D-CEDENTE), seedável via config. Liga
// documento → conta de pagamento (`fin_documents.debit_account_ref`). `next_nsa` é o contador
// monotônico de remessa (alocação é da 016). `status` controla o guard de conta encerrada
// (FR-015 da conciliação). varchar+CHECK para enum (ADR-0018/0020); PK UUID sem AUTO_INCREMENT.
//
// ⚠️ CHARSET/COLLATE — inserir manualmente na migration gerada (limitação Drizzle 0.45.x):
//   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; coluna `id` em utf8mb4_bin.
export const finCedenteAccounts = mysqlTable(
  'fin_cedente_accounts',
  {
    id: uuidKey('id').primaryKey().notNull(),
    bankCode: varchar('bank_code', { length: 8 }).notNull(),
    agency: varchar('agency', { length: 12 }).notNull(),
    accountNumber: varchar('account_number', { length: 20 }).notNull(),
    accountDigit: varchar('account_digit', { length: 4 }).notNull(),
    convenio: varchar('convenio', { length: 30 }).notNull(),
    document: varchar('document', { length: 20 }).notNull(),
    status: varchar('status', { length: 8 }).notNull(),
    nextNsa: int('next_nsa').notNull(),
    // Extensão conciliação (019) — nullable (ALTER ADD COLUMN não-quebrante, migration 0009).
    type: varchar('type', { length: 16 }),
    // #206: texto livre p/ identificar conta `outro`/`cartao` (nullable; ALTER ADD COLUMN aditivo).
    typeLabel: varchar('type_label', { length: 120 }),
    nickname: varchar('nickname', { length: 120 }),
    bankName: varchar('bank_name', { length: 120 }),
    openingBalanceCents: bigint('opening_balance_cents', { mode: 'number' }),
    openingBalanceDate: date('opening_balance_date', { mode: 'string' }),
  },
  (t) => [
    check('fin_cedente_accounts_status_chk', sql`${t.status} IN ('Active','Closed')`),
    check('fin_cedente_accounts_next_nsa_chk', sql`${t.nextNsa} >= 1`),
    check(
      'fin_cedente_accounts_type_chk',
      sql`${t.type} IS NULL OR ${t.type} IN ('corrente','poupanca','investimento','cartao','outro')`,
    ),
    // FR-016: unicidade por chave natural (banco + agência + conta + dígito).
    uniqueIndex('fin_cedente_accounts_natural_key_uq').on(
      t.bankCode,
      t.agency,
      t.accountNumber,
      t.accountDigit,
    ),
  ],
);

// ─── fin_bank_statements ──────────────────────────────────────────────────────
//
// Raiz do agregado BankStatement (US1 conciliação): extrato importado (OFX/CSV). period_* e file_*
// decompostos (sem JSON — ADR-0020); balanços em bigint cents. `file_format` é enum varchar+CHECK.
//
// ⚠️ CHARSET/COLLATE — inserir manualmente na migration gerada (limitação Drizzle 0.45.x):
//   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; `id`/`debit_account_ref` em utf8mb4_bin.
export const finBankStatements = mysqlTable(
  'fin_bank_statements',
  {
    id: uuidKey('id').primaryKey().notNull(),
    debitAccountRef: uuidKey('debit_account_ref').notNull(),
    periodStart: datetime('period_start', { mode: 'date', fsp: 3 }).notNull(),
    periodEnd: datetime('period_end', { mode: 'date', fsp: 3 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileFormat: varchar('file_format', { length: 8 }).notNull(),
    fileHash: opaqueKey('file_hash').notNull(),
    openingBalanceCents: bigint('opening_balance_cents', { mode: 'number' }).notNull(),
    closingBalanceCents: bigint('closing_balance_cents', { mode: 'number' }).notNull(),
  },
  (t) => [
    check('fin_bank_statements_file_format_chk', sql`${t.fileFormat} IN ('OFX','CSV','PDF')`),
    index('fin_bank_statements_debit_account_ref_idx').on(t.debitAccountRef),
  ],
);

// ─── fin_statement_transactions ───────────────────────────────────────────────
//
// Transações do extrato. `debit_account_ref` é desnormalizado da raiz para sustentar o índice ÚNICO
// `(debit_account_ref, fitid)` — defesa de anti-duplicidade (R5) no nível do banco, independente do
// dedup da aplicação. `movement`/`reconciliation_status`/`entry_type` são enums varchar+CHECK
// (`entry_type` fechado em #159 — spec 017). FK → raiz ON DELETE CASCADE (aggregate boundary).
export const finStatementTransactions = mysqlTable(
  'fin_statement_transactions',
  {
    id: uuidKey('id').primaryKey().notNull(),
    statementId: uuidKey('statement_id').notNull(),
    debitAccountRef: uuidKey('debit_account_ref').notNull(),
    fitid: opaqueKey('fitid').notNull(),
    date: datetime('date', { mode: 'date', fsp: 3 }).notNull(),
    movement: varchar('movement', { length: 8 }).notNull(),
    entryType: varchar('entry_type', { length: 16 }).notNull(),
    payeeName: varchar('payee_name', { length: 255 }).notNull(),
    memo: varchar('memo', { length: 500 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    balanceAfterCents: bigint('balance_after_cents', { mode: 'number' }).notNull(),
    reconciliationStatus: varchar('reconciliation_status', { length: 12 }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.statementId],
      foreignColumns: [finBankStatements.id],
      name: 'fin_statement_transactions_statement_id_fk',
    }).onDelete('cascade'),
    uniqueIndex('fin_statement_transactions_account_fitid_uq').on(t.debitAccountRef, t.fitid),
    index('fin_statement_transactions_statement_id_idx').on(t.statementId),
    check('fin_statement_transactions_movement_chk', sql`${t.movement} IN ('Debit','Credit')`),
    check(
      'fin_statement_transactions_entry_type_chk',
      sql`${t.entryType} IN ('PIX','TED','DOC','Fee','Boleto','DARF','Investment','Redemption','Transfer','Other')`,
    ),
    check(
      'fin_statement_transactions_recon_status_chk',
      sql`${t.reconciliationStatus} IN ('Pending','Reconciled','ManualEntry')`,
    ),
  ],
);

// ─── fin_reconciliations ───────────────────────────────────────────────────────
//
// Raiz do agregado Reconciliation (US2/3/4). `transaction_id`/`payable_id` (nos itens) referenciam
// outros agregados POR IDENTIDADE (sem FK cross-aggregate — D-AGGREGATES/Evans); só os itens têm FK
// para a própria raiz (boundary). `difference_*` decompõe o VO Difference (sem JSON — ADR-0020).
// ⚠️ CHARSET table-level manual na migration (ENGINE=InnoDB ...); a collation de
// id/transaction_id/*_by vem dos tipos de identifier-columns.ts (#636).
export const finReconciliations = mysqlTable(
  'fin_reconciliations',
  {
    id: uuidKey('id').primaryKey().notNull(),
    transactionId: uuidKey('transaction_id').notNull(),
    type: varchar('type', { length: 12 }).notNull(),
    status: varchar('status', { length: 8 }).notNull(),
    differenceValueCents: bigint('difference_value_cents', { mode: 'number' }),
    differenceTreatment: varchar('difference_treatment', { length: 10 }),
    reconciledAt: datetime('reconciled_at', { mode: 'date', fsp: 3 }).notNull(),
    reconciledBy: uuidKey('reconciled_by').notNull(),
    undoneAt: datetime('undone_at', { mode: 'date', fsp: 3 }),
    undoneBy: uuidKey('undone_by'),
    undoReason: varchar('undo_reason', { length: 500 }),
  },
  (t) => [
    check(
      'fin_reconciliations_type_chk',
      sql`${t.type} IN ('Individual','Multiple','Partial','ManualEntry')`,
    ),
    check('fin_reconciliations_status_chk', sql`${t.status} IN ('Active','Undone')`),
    check(
      'fin_reconciliations_difference_chk',
      sql`(${t.differenceValueCents} IS NULL AND ${t.differenceTreatment} IS NULL) OR (${t.differenceValueCents} IS NOT NULL AND ${t.differenceTreatment} IN ('Interest','Penalty','Discount','Fee','Partial'))`,
    ),
    index('fin_reconciliations_transaction_id_idx').on(t.transactionId),
  ],
);

// ─── fin_reconciliation_items ──────────────────────────────────────────────────
//
// Itens da conciliação (1 por título). PK composta (reconciliation_id, payable_id) — chave natural.
// FK → raiz ON DELETE CASCADE (boundary). `payable_id` é referência por identidade (sem FK cross-aggregate).
export const finReconciliationItems = mysqlTable(
  'fin_reconciliation_items',
  {
    reconciliationId: uuidKey('reconciliation_id').notNull(),
    payableId: uuidKey('payable_id').notNull(),
    reconciledValueCents: bigint('reconciled_value_cents', { mode: 'number' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.reconciliationId, t.payableId] }),
    foreignKey({
      columns: [t.reconciliationId],
      foreignColumns: [finReconciliations.id],
      name: 'fin_reconciliation_items_reconciliation_id_fk',
    }).onDelete('cascade'),
    index('fin_reconciliation_items_payable_id_idx').on(t.payableId),
  ],
);

// ─── fin_rejected_suggestions ──────────────────────────────────────────────────
//
// Sugestões de match rejeitadas pelo operador (US2 — #121). Aqui só a TABELA (sem use-case nesta fatia);
// o índice único impede rejeitar a mesma dupla (transação, título) duas vezes.
export const finRejectedSuggestions = mysqlTable(
  'fin_rejected_suggestions',
  {
    id: uuidKey('id').primaryKey().notNull(),
    transactionId: uuidKey('transaction_id').notNull(),
    payableId: uuidKey('payable_id').notNull(),
    rejectedAt: datetime('rejected_at', { mode: 'date', fsp: 3 }).notNull(),
    rejectedBy: uuidKey('rejected_by').notNull(),
  },
  (t) => [uniqueIndex('fin_rejected_suggestions_tx_payable_uq').on(t.transactionId, t.payableId)],
);

// ─── fin_manual_entries ────────────────────────────────────────────────────────
//
// Lançamento manual (US5): registro contábil de uma conciliação tipo `ManualEntry` (transação sem
// título — ex.: tarifa). Parte do boundary da Reconciliation → FK ON DELETE CASCADE. `type` enum
// varchar+CHECK; refs (supplier/category/cost_center/program) opcionais por identidade (sem FK cross-aggregate).
// ⚠️ CHARSET table-level manual na migration; id/reconciliation_id/*_ref têm utf8mb4_bin pelo tipo.
export const finManualEntries = mysqlTable(
  'fin_manual_entries',
  {
    id: uuidKey('id').primaryKey().notNull(),
    reconciliationId: uuidKey('reconciliation_id').notNull(),
    type: varchar('type', { length: 24 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    supplierRef: uuidKey('supplier_ref'),
    // #502/S2: taxonomia planejável no título manual — plano orçamentário + subcategoria (folha da
    // árvore do plano). Refs opacos por identidade (varchar(36), sem FK — ADR-0014), como os irmãos.
    budgetPlanRef: uuidKey('budget_plan_ref'),
    subcategoryRef: uuidKey('subcategory_ref'),
    categoryRef: uuidKey('category_ref'),
    costCenterRef: uuidKey('cost_center_ref'),
    programRef: uuidKey('program_ref'),
    description: varchar('description', { length: 500 }),
    // #143: realocação patrimonial — conta de destino (Transfer) e produto livre (Investment/Redemption).
    destinationAccountRef: uuidKey('destination_account_ref'),
    productLabel: varchar('product_label', { length: 120 }),
    // #370: campos de documento (rastreabilidade). `document_value_cents` default = valor da transação
    // (aplicado no domínio); pode divergir. Nullable — lançamentos antigos não têm documento.
    documentNumber: varchar('document_number', { length: 60 }),
    documentType: varchar('document_type', { length: 16 }),
    issueDate: date('issue_date', { mode: 'date' }),
    documentValueCents: bigint('document_value_cents', { mode: 'number' }),
  },
  (t) => [
    foreignKey({
      columns: [t.reconciliationId],
      foreignColumns: [finReconciliations.id],
      name: 'fin_manual_entries_reconciliation_id_fk',
    }).onDelete('cascade'),
    check(
      'fin_manual_entries_type_chk',
      sql`${t.type} IN ('Payment','Receipt','Transfer','FeePenaltyInterest','Investment','Redemption')`,
    ),
    check('fin_manual_entries_value_chk', sql`${t.valueCents} > 0`),
    index('fin_manual_entries_reconciliation_id_idx').on(t.reconciliationId),
  ],
);

// ─── fin_reconciliation_periods ────────────────────────────────────────────────
//
// Período de conciliação fechado (US6 — "selo" contábil). UNIQUE `(debit_account_ref, period_start,
// period_end)` impede fechar o mesmo período 2×. `status` enum varchar+CHECK. Datas date-only.
// ⚠️ CHARSET table-level manual na migration; id/debit_account_ref/closed_by têm utf8mb4_bin pelo tipo.
export const finReconciliationPeriods = mysqlTable(
  'fin_reconciliation_periods',
  {
    id: uuidKey('id').primaryKey().notNull(),
    debitAccountRef: uuidKey('debit_account_ref').notNull(),
    periodStart: date('period_start', { mode: 'date' }).notNull(),
    periodEnd: date('period_end', { mode: 'date' }).notNull(),
    status: varchar('status', { length: 8 }).notNull(),
    closedAt: datetime('closed_at', { mode: 'date', fsp: 3 }),
    closedBy: uuidKey('closed_by'),
  },
  (t) => [
    check('fin_reconciliation_periods_status_chk', sql`${t.status} IN ('Open','Closed')`),
    uniqueIndex('fin_reconciliation_periods_account_range_uq').on(
      t.debitAccountRef,
      t.periodStart,
      t.periodEnd,
    ),
  ],
);

// ─── fin_expected_counterpart ──────────────────────────────────────────────────
//
// Contrapartida esperada de uma transferência A→B (#269). A perna esperada na conta de DESTINO —
// agregado próprio (não uma StatementTransaction marcada; Vernon IDDD p.450). `destination/origin_account_ref`,
// `origin_reconciliation_ref` e `origin_transaction_ref` referenciam outros agregados POR IDENTIDADE
// (sem FK cross-aggregate — D-AGGREGATES/Evans). `type`/`movement`/`status` enum varchar+CHECK (ADR-0020);
// cents = bigint; `expected_date` date-only. Índices: `(destination_account_ref, status)` = fila/seletor
// de B; `(origin_reconciliation_ref)` = tratamento no undo da origem (US3).
// ⚠️ CHARSET table-level manual na migration; id/*_ref têm utf8mb4_bin pelo tipo.
export const finExpectedCounterpart = mysqlTable(
  'fin_expected_counterpart',
  {
    id: uuidKey('id').primaryKey().notNull(),
    destinationAccountRef: uuidKey('destination_account_ref').notNull(),
    originAccountRef: uuidKey('origin_account_ref').notNull(),
    originReconciliationRef: uuidKey('origin_reconciliation_ref').notNull(),
    originTransactionRef: uuidKey('origin_transaction_ref').notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    // #428: produto da operação (Investment/Redemption); NULL para Transfer. Espelhado na perna B.
    productLabel: varchar('product_label', { length: 120 }),
    movement: varchar('movement', { length: 8 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    expectedDate: date('expected_date', { mode: 'date' }).notNull(),
    status: varchar('status', { length: 12 }).notNull(),
    matchedTransactionRef: uuidKey('matched_transaction_ref'),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    check(
      'fin_expected_counterpart_type_chk',
      sql`${t.type} IN ('Transfer','Investment','Redemption')`,
    ),
    check('fin_expected_counterpart_movement_chk', sql`${t.movement} IN ('Debit','Credit')`),
    check(
      'fin_expected_counterpart_status_chk',
      sql`${t.status} IN ('Pending','Matched','Discarded')`,
    ),
    check('fin_expected_counterpart_value_chk', sql`${t.valueCents} > 0`),
    index('fin_expected_counterpart_destination_status_idx').on(t.destinationAccountRef, t.status),
    index('fin_expected_counterpart_origin_reconciliation_idx').on(t.originReconciliationRef),
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

export type TimelineEntryRow = typeof finDocumentTimeline.$inferSelect;
export type NewTimelineEntryRow = typeof finDocumentTimeline.$inferInsert;

export type TimelineFieldChangeRow = typeof finTimelineFieldChanges.$inferSelect;
export type NewTimelineFieldChangeRow = typeof finTimelineFieldChanges.$inferInsert;

export type SupplierViewRow = typeof finSupplierView.$inferSelect;
export type NewSupplierViewRow = typeof finSupplierView.$inferInsert;

export type CedenteAccountRow = typeof finCedenteAccounts.$inferSelect;
export type NewCedenteAccountRow = typeof finCedenteAccounts.$inferInsert;

export type BankStatementRow = typeof finBankStatements.$inferSelect;
export type NewBankStatementRow = typeof finBankStatements.$inferInsert;

export type StatementTransactionRow = typeof finStatementTransactions.$inferSelect;
export type NewStatementTransactionRow = typeof finStatementTransactions.$inferInsert;

export type ReconciliationRow = typeof finReconciliations.$inferSelect;
export type NewReconciliationRow = typeof finReconciliations.$inferInsert;

export type ReconciliationItemRow = typeof finReconciliationItems.$inferSelect;
export type NewReconciliationItemRow = typeof finReconciliationItems.$inferInsert;

export type RejectedSuggestionRow = typeof finRejectedSuggestions.$inferSelect;
export type NewRejectedSuggestionRow = typeof finRejectedSuggestions.$inferInsert;

export type ManualEntryRow = typeof finManualEntries.$inferSelect;
export type NewManualEntryRow = typeof finManualEntries.$inferInsert;

export type ReconciliationPeriodRow = typeof finReconciliationPeriods.$inferSelect;
export type NewReconciliationPeriodRow = typeof finReconciliationPeriods.$inferInsert;

export type ExpectedCounterpartRow = typeof finExpectedCounterpart.$inferSelect;
export type NewExpectedCounterpartRow = typeof finExpectedCounterpart.$inferInsert;

// ─── fin_categories ───────────────────────────────────────────────────────────
//
// Dado de referência LOCAL do financeiro (020 · Decisão A — research.md D1): categorias de
// classificação, agrupadas por natureza (`group` ∈ despesa/receita/ajuste). Povoadas por seed
// idempotente com UUIDs fixos (SC-002). Read-only nesta feature (sem CRUD — FR-008).
//
// `group`: varchar(12) + CHECK (ADR-0020 — sem ENUM nativo); cast row→union seguro pós-CHECK.
// Índices: (group, name) para a listagem agrupada+ordenada; active para o filtro de seleção.
export const finCategories = mysqlTable(
  'fin_categories',
  {
    id: uuidKey('id').primaryKey().notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    group: varchar('group', { length: 12 }).notNull(),
    active: boolean('active').notNull().default(true),
    // Hierarquia auto-referente (#147 F3): pai da categoria (subcategoria). Nullable = top-level.
    // Sem FK física (mesma tabela; validação de existência é do seed) — ADR-0014.
    parentId: uuidKey('parent_id'),
    // #341: nível Centro de Custo → Categoria. Soft ref a fin_cost_centers (sem FK — ADR-0014, igual
    // ao parent_id). Nullable = categoria sem centro (back-compat pré-#341). Cascata no front:
    // costCenterId (top-level) + parentId (subcategoria).
    costCenterId: uuidKey('cost_center_id'),
  },
  (t) => [
    check('fin_categories_group_chk', sql`${t.group} IN ('despesa','receita','ajuste')`),
    index('fin_categories_group_name_idx').on(t.group, t.name),
    index('fin_categories_active_idx').on(t.active),
    index('fin_categories_parent_id_idx').on(t.parentId),
    index('fin_categories_cost_center_id_idx').on(t.costCenterId),
  ],
);

export type CategoryRow = typeof finCategories.$inferSelect;
export type NewCategoryRow = typeof finCategories.$inferInsert;

// ─── fin_cost_centers ───────────────────────────────────────────────────────
//
// Dado de referência LOCAL do financeiro (020 · US2 — Decisão A): centros de custo (dimensão de
// rateio), `code` (CC-001…) + `name`. Povoados por seed idempotente com UUIDs fixos (SC-002).
// Read-only nesta feature (sem CRUD — FR-008). Índices: `code` (ordenação) e `active` (seleção).
export const finCostCenters = mysqlTable(
  'fin_cost_centers',
  {
    id: uuidKey('id').primaryKey().notNull(),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    index('fin_cost_centers_code_idx').on(t.code),
    index('fin_cost_centers_active_idx').on(t.active),
  ],
);

export type CostCenterRow = typeof finCostCenters.$inferSelect;
export type NewCostCenterRow = typeof finCostCenters.$inferInsert;

// ─── fin_outbox ───────────────────────────────────────────────────────────────
//
// Outbox transacional do módulo Financeiro (#127, ADR-0015). Estado do agregado + evento são
// gravados na MESMA db.transaction (atomicidade; evento durável SSE estado persistido). Espelha
// `ctr_outbox` (contracts). UUID v4 como varchar(36) — convenção do módulo (sem char). payload é
// VARCHAR(8192) serializado — NUNCA JSON nativo (ADR-0020). Idempotência via PK `event_id`.

/**
 * FONTE ÚNICA dos agregados que podem publicar no outbox do Financeiro.
 *
 * Existe porque a lista viver escrita à mão em dois CHECKs custou um CI vermelho: `RemittanceEvent`
 * entrou na union de eventos, o TypeScript aprovou, e todo `save` de remessa passou a reverter em
 * runtime contra a constraint. O `Result` do repo devolvia erro de persistência sem dizer que a
 * causa era um valor não previsto pelo banco.
 *
 * Consumida pelos dois CHECKs (tabela e DLQ) e pelo `extractAggregateInfo` do helper, que a usa
 * como TIPO — então um agregado novo que não esteja aqui **não compila**. O que o compilador não
 * alcança é "esqueci de rodar `db:generate`"; disso cuida
 * `tests/cleanup/outbox-aggregate-types-in-check.test.ts`.
 *
 * ⚠️ Acrescentar valor aqui EXIGE `pnpm run db:generate:financial` — a constraint vive no banco.
 */
export const FIN_OUTBOX_AGGREGATE_TYPES = [
  'Document',
  'Reconciliation',
  'Statement',
  'ReconciliationPeriod',
  'ExpectedCounterpart',
  'Remittance',
] as const;

export type FinOutboxAggregateType = (typeof FIN_OUTBOX_AGGREGATE_TYPES)[number];

// A DLQ usa a MESMA lista — o comentário dela sempre prometeu "espelha o CHECK da tabela-fonte", e
// a promessa não se sustentava: `ExpectedCounterpart` existia na fonte e faltava lá desde a 0028,
// o que faria o INSERT de DLQ falhar justamente quando um evento desse tipo esgotasse os retries.
const aggregateTypeSqlList = (): SQL =>
  sql.raw(FIN_OUTBOX_AGGREGATE_TYPES.map((t) => `'${t}'`).join(', '));
export const finOutbox = mysqlTable(
  'fin_outbox',
  {
    // UUID v4 do evento — gerado pelo domínio antes do INSERT (idempotência via PK).
    eventId: uuidKey('event_id').primaryKey().notNull(),
    // id do agregado dono (documento / conciliação / extrato / período / contrapartida).
    aggregateId: uuidKey('aggregate_id').notNull(),
    // 'Document' | 'Reconciliation' | 'Statement' | 'ReconciliationPeriod' | 'ExpectedCounterpart'
    // | 'Remittance' — CHECK abaixo.
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    // PascalCase EN: DocumentSaved, PayableReconciled, …
    eventType: varchar('event_type', { length: 64 }).notNull(),
    // Versão do contrato do payload (inicia em 1).
    schemaVersion: int('schema_version').notNull(),
    // Instante do domain event.
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Instante do INSERT na outbox (audit trail).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // NULL = pendente; NOT NULL = worker marcou após delivery.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Tentativas de entrega (worker). Default 0.
    attempts: int('attempts').notNull().default(0),
    // Payload serializado — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    check('fin_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    check('fin_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    check('fin_outbox_aggregate_type_chk', sql`${t.aggregateType} IN (${aggregateTypeSqlList()})`),
    // Índice do worker (ADR-0015): processed_at PRIMEIRO → NULLs agrupados → range scan eficiente.
    index('fin_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    index('fin_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

export type FinOutboxRow = typeof finOutbox.$inferSelect;
export type NewFinOutboxRow = typeof finOutbox.$inferInsert;

// ─── fin_outbox_dead_letter ───────────────────────────────────────────────────
//
// #307: DLQ do `fin_outbox` (o financial nunca teve consumidor; esta é a 1ª). Mirror de
// `ctr_outbox_dead_letter`. O worker move a row pra cá após `maxAttempts` (ou payload corrupto);
// `failed_at` + `last_error` guardam o contexto da falha. Sem `processed_at` (é terminal).
export const finOutboxDeadLetter = mysqlTable(
  'fin_outbox_dead_letter',
  {
    eventId: uuidKey('event_id').primaryKey().notNull(),
    aggregateId: uuidKey('aggregate_id').notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: int('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    failedAt: datetime('failed_at', { mode: 'date', fsp: 3 }).notNull(),
    attempts: int('attempts').notNull(),
    lastError: varchar('last_error', { length: 2048 }).notNull(),
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    check('fin_outbox_dl_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    // Paridade com `ctr_outbox_dead_letter` + defesa em profundidade contra writers diretos futuros
    // (ex.: borda admin de DLQ). Espelha o CHECK da tabela-fonte `fin_outbox`.
    check(
      'fin_outbox_dl_aggregate_type_chk',
      sql`${t.aggregateType} IN (${aggregateTypeSqlList()})`,
    ),
    index('fin_outbox_dl_failed_at_idx').on(t.failedAt),
  ],
);

export type FinOutboxDeadLetterRow = typeof finOutboxDeadLetter.$inferSelect;
export type NewFinOutboxDeadLetterRow = typeof finOutboxDeadLetter.$inferInsert;

// ─── fin_remittances ──────────────────────────────────────────────────────────
//
// Lote de comunicação: UM arquivo de remessa por conta-cedente (016). Existe porque o documento só
// vira `Transmitted` quando o `status/` do agente confirma (ADR-0061): entre gravar no bucket e
// confirmar há uma janela de até 5 minutos, e é esta linha que segura os documentos nela.
//
// `status` em varchar+CHECK (ADR-0020, sem ENUM nativo). `Failed` NÃO libera os documentos — só
// `Discarded`, que exige decisão humana registrada em `detail`.
//
// ⚠️ CHARSET/COLLATE — inserir manualmente na migration gerada (limitação Drizzle 0.45.x):
//   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; coluna `id` em utf8mb4_bin.
export const finRemittances = mysqlTable(
  'fin_remittances',
  {
    id: uuidKey('id').primaryKey().notNull(),
    // Ref lógica a fin_cedente_accounts; sem FK física (ADR-0014 §cross-acoplamento).
    cedenteAccountId: uuidKey('cedente_account_id').notNull(),
    nsa: int('nsa').notNull(),
    fileName: varchar('file_name', { length: 128 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    generatedAt: datetime('generated_at', { mode: 'string', fsp: 3 }).notNull(),
    settledAt: datetime('settled_at', { mode: 'string', fsp: 3 }),
    // O teto vem do CONTRATO do envelope, não o contrário (#781). Citar a constante em vez de
    // repetir `512` é o que impede os dois números de divergirem — e a divergência aqui não é
    // cosmética: um `detalhe` maior que a coluna falha o INSERT com 1406 no MySQL estrito, o que
    // derrubaria o registro do desfecho por causa de um campo de diagnóstico.
    detail: varchar('detail', { length: VAN_STATUS_DETAIL_MAX_LENGTH }),
  },
  (t) => [
    check(
      'fin_remittances_status_chk',
      sql`${t.status} IN ('Queued','Transmitted','Failed','Discarded')`,
    ),
    // O campo do header tem 6 dígitos (VO `Nsa`); o banco recusa o que não couber.
    check('fin_remittances_nsa_range_chk', sql`${t.nsa} >= 1 AND ${t.nsa} <= 999999`),
    // NSA é único POR CONTA-CEDENTE, não global: cada conta tem seu contador. Duas remessas com o
    // mesmo NSA na mesma conta seriam retransmissão aos olhos do banco.
    uniqueIndex('fin_remittances_account_nsa_uq').on(t.cedenteAccountId, t.nsa),
    // O nome do arquivo é a chave de idempotência DO AGENTE: nome repetido não é retransmitido.
    // Repetir aqui produziria uma remessa que o agente descarta em silêncio.
    uniqueIndex('fin_remittances_file_name_uq').on(t.fileName),
    index('fin_remittances_status_idx').on(t.status),
  ],
);

export type FinRemittanceRow = typeof finRemittances.$inferSelect;
export type NewFinRemittanceRow = typeof finRemittances.$inferInsert;

// ─── fin_remittance_documents ─────────────────────────────────────────────────
//
// Vínculo remessa → documentos. É o que a seleção consulta para NÃO incluir de novo um documento
// que já está numa remessa viva (`holdsDocuments`). Sem esta tabela, a janela entre gravar e
// confirmar deixaria o mesmo documento ser selecionado duas vezes — pagamento em dobro.
//
// PK composta (remittance_id, document_id): o mesmo documento não entra duas vezes na mesma remessa,
// e o índice por documento responde "este documento está preso em alguma remessa?" sem varredura.
export const finRemittanceDocuments = mysqlTable(
  'fin_remittance_documents',
  {
    remittanceId: uuidKey('remittance_id').notNull(),
    documentId: uuidKey('document_id').notNull(),
    // G064 "Seu Número" — a referência emitida por ESTE documento nesta remessa (#752).
    //
    // 20 é a largura do campo no Segmento A (colunas 074-093); hoje a derivação usa 12 (NSA + posição
    // do pagamento), e a folga é do layout, não desperdício.
    //
    // `NOT NULL` sem default: a referência é o que liga o retorno ao título, e uma linha sem ela é um
    // documento preso cuja chave de casamento ninguém sabe qual é. Sem default porque não existe
    // valor plausível — inventar um reintroduziria, no schema, o mesmo fallback silencioso que a
    // issue veio remover do emissor.
    yourNumber: varchar('your_number', { length: 20 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.remittanceId, t.documentId] }),
    index('fin_remittance_documents_document_idx').on(t.documentId),
    // O caminho de leitura do RETORNO (#690): o banco devolve a referência, e é por ela que se
    // chega ao documento. UNIQUE, e não índice comum, porque referência repetida torna o casamento
    // ambíguo — o mesmo pagamento apontando para dois títulos. O domínio já recusa duplicata dentro
    // de um arquivo; este índice é a rede que pega o caso entre arquivos, se o NSA algum dia repetir.
    uniqueIndex('fin_remittance_documents_your_number_uk').on(t.yourNumber),
  ],
);

export type FinRemittanceDocumentRow = typeof finRemittanceDocuments.$inferSelect;
export type NewFinRemittanceDocumentRow = typeof finRemittanceDocuments.$inferInsert;

// ─── fin_van_return_quarantine ────────────────────────────────────────────────
//
// A quarentena do prefixo de retorno (#753). A caixa da VAN é do CONVÊNIO, não nossa: chegam ali
// arquivos de operações que nunca passaram por este sistema. Esta tabela é o que responde "o que
// está preso agora, desde quando e por quê" — a DoD da issue nomeia o anti-padrão que ela existe
// para impedir: *"quarentena consultável, não apenas uma linha de log"*.
//
// A PK é a CHAVE DO OBJETO, e não um UUID nosso: a identidade aqui vem de fora, é atribuída por
// quem depositou, e a linha existe para falar sobre aquele objeto específico. UUID próprio abriria
// espaço para duas linhas sobre a mesma chave — que é exatamente o que a idempotência da varredura
// (roda a cada ciclo, sobre um bucket onde o agente não apaga nada) precisa impedir.
//
// ⚠️ NÃO indexar nem casar por nome de arquivo: o nome é do banco e ganha sufixo desempatador em
// colisão (van-agent, P3). Casar por nome perde objeto justamente quando dois disputam o mesmo.
export const finVanReturnQuarantine = mysqlTable(
  'fin_van_return_quarantine',
  {
    objectKey: objectStorageKey('object_key').primaryKey().notNull(),
    reason: varchar('reason', { length: 32 }).notNull(),
    // O que NÓS calculamos sobre os bytes do objeto.
    observedSha256: sha256HexKey('observed_sha256').notNull(),
    // O que o ENVELOPE declarava. Nulo fora de `hash-mismatch` — nos outros motivos não houve
    // envelope válido para declarar coisa alguma, e string vazia faria a consulta mentir sobre ter
    // havido uma declaração.
    expectedSha256: sha256HexKey('expected_sha256'),
    // Instantes como string ISO, seguindo a tabela irmã `fin_remittances` — o port da quarentena
    // trafega string, e converter duas vezes só criaria lugar para divergir.
    firstSeenAt: datetime('first_seen_at', { mode: 'string', fsp: 3 }).notNull(),
    lastSeenAt: datetime('last_seen_at', { mode: 'string', fsp: 3 }).notNull(),
    releasedAt: datetime('released_at', { mode: 'string', fsp: 3 }),
  },
  (t) => [
    // Motivo novo exige decisão nossa, e o banco é o lugar que não deixa escapar. Mesma disciplina
    // do parser do envelope, que recusa `situacao` desconhecida em vez de tratá-la como falha.
    check(
      'fin_van_return_quarantine_reason_chk',
      sql`${t.reason} IN ('missing-provenance','hash-mismatch','origin-not-logged')`,
    ),
    // A consulta padrão é "o que está preso" — `released_at IS NULL`. Sem este índice ela varre a
    // tabela inteira, e a tabela só cresce: o agente nunca apaga do prefixo de retorno.
    index('fin_van_return_quarantine_released_idx').on(t.releasedAt),
  ],
);

export type FinVanReturnQuarantineRow = typeof finVanReturnQuarantine.$inferSelect;
export type NewFinVanReturnQuarantineRow = typeof finVanReturnQuarantine.$inferInsert;
