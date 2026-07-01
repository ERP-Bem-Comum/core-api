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
  primaryKey,
  text,
  uniqueIndex,
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

    // Ref ao favorecido (cross-módulo partners). Sem FK física (ADR-0014 §cross-módulo sem acoplamento direto).
    supplierRef: varchar('supplier_ref', { length: 36 }),

    // Tipo do favorecido (#90). Nullable: back-compat com documentos pré-#90 (lidos como 'supplier').
    // CHECK = enum de domínio (4 valores — domain/document/types.ts §PayeeKind; ADR-0020 §"sem ENUM").
    payeeKind: varchar('payee_kind', { length: 16 }),

    // Refs cruzadas opcionais (cross-BC — ADR-0014): sem FK física.
    contractRef: varchar('contract_ref', { length: 36 }),
    budgetPlanRef: varchar('budget_plan_ref', { length: 36 }),
    categoryRef: varchar('category_ref', { length: 36 }),
    costCenterRef: varchar('cost_center_ref', { length: 36 }),
    programRef: varchar('program_ref', { length: 36 }),

    // Conta-cedente de débito (D-CEDENTE — de qual conta o pagamento sai). Ref lógica a
    // fin_cedente_accounts; sem FK física (ADR-0014 §cross-acoplamento). Nullable até a remessa atribuir.
    debitAccountRef: varchar('debit_account_ref', { length: 36 }),

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

    // Data de EMISSÃO (#163) — capturada no create (OCR/manual); nullable (opcional + back-compat).
    issueDate: date('issue_date', { mode: 'date' }),

    // #115: chave de acesso (44 dígitos) da DANFE; null nos demais tipos.
    accessKey: varchar('access_key', { length: 44 }),

    // #197: competência contábil (mês de referência) 'YYYY-MM'; conta-débito reusa debit_account_ref.
    competencia: varchar('competencia', { length: 7 }),

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

    // Aprovador PRETENDIDO definido na inclusão (#148) — cross-BC (auth), sem FK física. Nullable
    // (opcional + back-compat). Distinto de approved_by (efetivado na aprovação).
    approverRef: varchar('approver_ref', { length: 36 }),

    // #273: complemento da forma de pagamento (texto livre opaco — linha digitável de boleto,
    // id de cartão corporativo, referência de câmbio). Nullable + sem CHECK (string livre).
    // ADR-0018 §"Texto livre curto" → varchar(255). Migration 0026 (ALTER ADD COLUMN, INSTANT).
    paymentDetail: varchar('payment_detail', { length: 255 }),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),

    // Liga ao evento de domínio que originou o marco (idempotência futura).
    eventId: varchar('event_id', { length: 36 }).notNull(),

    // Agrupa a trilha por documento (mesmo quando target = Payable).
    // FK ON DELETE CASCADE — pertence ao AGGREGATE BOUNDARY do documento.
    documentId: varchar('document_id', { length: 36 }).notNull(),

    // Discriminador do alvo: 'Document' ou 'Payable'. varchar(8) cobre ambos.
    targetKind: varchar('target_kind', { length: 8 }).notNull(),

    // ID do alvo (DocumentId ou PayableId — UUID v4).
    targetId: varchar('target_id', { length: 36 }).notNull(),

    // Tipo do marco: discriminador EN dos eventos de domínio (domain/document/events.ts).
    // varchar(40): 'DocumentDraftSaved' tem 19 chars; margem para future events.
    eventType: varchar('event_type', { length: 40 }).notNull(),

    // Instante do marco: injetado via Clock (never new Date() no domínio).
    // datetime(fsp:3) = milissegundo; mode:'date' = Date nativo (ADR-0020 §"Timestamps").
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),

    // Ref ao autor (cross-BC — sem FK física; ADR-0014). Nullable: FR-005 best-effort.
    actorRef: varchar('actor_ref', { length: 36 }),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),

    // FK para a entry que originou este campo alterado (ON DELETE CASCADE).
    timelineEntryId: varchar('timeline_entry_id', { length: 36 }).notNull(),

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
  supplierRef: varchar('supplier_ref', { length: 36 }).primaryKey().notNull(),

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
    payableId: varchar('payable_id', { length: 36 }).primaryKey().notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),
    kind: varchar('kind', { length: 10 }).notNull(), // Parent | Child
    retentionType: varchar('retention_type', { length: 10 }),
    supplierRef: varchar('supplier_ref', { length: 36 }),
    contractRef: varchar('contract_ref', { length: 36 }),
    categoryRef: varchar('category_ref', { length: 36 }),
    costCenterRef: varchar('cost_center_ref', { length: 36 }),
    programRef: varchar('program_ref', { length: 36 }),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    status: varchar('status', { length: 12 }).notNull(), // Open|Approved|Paid|Cancelled
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    index('fin_payable_view_status_idx').on(t.status),
    index('fin_payable_view_cost_center_ref_idx').on(t.costCenterRef),
    index('fin_payable_view_category_ref_idx').on(t.categoryRef),
    index('fin_payable_view_program_ref_idx').on(t.programRef),
    index('fin_payable_view_supplier_ref_idx').on(t.supplierRef),
    index('fin_payable_view_due_date_idx').on(t.dueDate),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    debitAccountRef: varchar('debit_account_ref', { length: 36 }).notNull(),
    periodStart: datetime('period_start', { mode: 'date', fsp: 3 }).notNull(),
    periodEnd: datetime('period_end', { mode: 'date', fsp: 3 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileFormat: varchar('file_format', { length: 8 }).notNull(),
    fileHash: varchar('file_hash', { length: 64 }).notNull(),
    openingBalanceCents: bigint('opening_balance_cents', { mode: 'number' }).notNull(),
    closingBalanceCents: bigint('closing_balance_cents', { mode: 'number' }).notNull(),
  },
  (t) => [
    check('fin_bank_statements_file_format_chk', sql`${t.fileFormat} IN ('OFX','CSV')`),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    statementId: varchar('statement_id', { length: 36 }).notNull(),
    debitAccountRef: varchar('debit_account_ref', { length: 36 }).notNull(),
    fitid: varchar('fitid', { length: 64 }).notNull(),
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
// ⚠️ CHARSET/COLLATE manual na migration: ENGINE=InnoDB ...; id/transaction_id/*_by em utf8mb4_bin.
export const finReconciliations = mysqlTable(
  'fin_reconciliations',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    transactionId: varchar('transaction_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 12 }).notNull(),
    status: varchar('status', { length: 8 }).notNull(),
    differenceValueCents: bigint('difference_value_cents', { mode: 'number' }),
    differenceTreatment: varchar('difference_treatment', { length: 10 }),
    reconciledAt: datetime('reconciled_at', { mode: 'date', fsp: 3 }).notNull(),
    reconciledBy: varchar('reconciled_by', { length: 36 }).notNull(),
    undoneAt: datetime('undone_at', { mode: 'date', fsp: 3 }),
    undoneBy: varchar('undone_by', { length: 36 }),
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
    reconciliationId: varchar('reconciliation_id', { length: 36 }).notNull(),
    payableId: varchar('payable_id', { length: 36 }).notNull(),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    transactionId: varchar('transaction_id', { length: 36 }).notNull(),
    payableId: varchar('payable_id', { length: 36 }).notNull(),
    rejectedAt: datetime('rejected_at', { mode: 'date', fsp: 3 }).notNull(),
    rejectedBy: varchar('rejected_by', { length: 36 }).notNull(),
  },
  (t) => [uniqueIndex('fin_rejected_suggestions_tx_payable_uq').on(t.transactionId, t.payableId)],
);

// ─── fin_manual_entries ────────────────────────────────────────────────────────
//
// Lançamento manual (US5): registro contábil de uma conciliação tipo `ManualEntry` (transação sem
// título — ex.: tarifa). Parte do boundary da Reconciliation → FK ON DELETE CASCADE. `type` enum
// varchar+CHECK; refs (supplier/category/cost_center/program) opcionais por identidade (sem FK cross-aggregate).
// ⚠️ CHARSET/COLLATE manual na migration: id/reconciliation_id/*_ref em utf8mb4_bin.
export const finManualEntries = mysqlTable(
  'fin_manual_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    reconciliationId: varchar('reconciliation_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 24 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    supplierRef: varchar('supplier_ref', { length: 36 }),
    categoryRef: varchar('category_ref', { length: 36 }),
    costCenterRef: varchar('cost_center_ref', { length: 36 }),
    programRef: varchar('program_ref', { length: 36 }),
    description: varchar('description', { length: 500 }),
    // #143: realocação patrimonial — conta de destino (Transfer) e produto livre (Investment/Redemption).
    destinationAccountRef: varchar('destination_account_ref', { length: 36 }),
    productLabel: varchar('product_label', { length: 120 }),
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
// ⚠️ CHARSET/COLLATE manual na migration: id/debit_account_ref/closed_by em utf8mb4_bin.
export const finReconciliationPeriods = mysqlTable(
  'fin_reconciliation_periods',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    debitAccountRef: varchar('debit_account_ref', { length: 36 }).notNull(),
    periodStart: date('period_start', { mode: 'date' }).notNull(),
    periodEnd: date('period_end', { mode: 'date' }).notNull(),
    status: varchar('status', { length: 8 }).notNull(),
    closedAt: datetime('closed_at', { mode: 'date', fsp: 3 }),
    closedBy: varchar('closed_by', { length: 36 }),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    group: varchar('group', { length: 12 }).notNull(),
    active: boolean('active').notNull().default(true),
    // Hierarquia auto-referente (#147 F3): pai da categoria (subcategoria). Nullable = top-level.
    // Sem FK física (mesma tabela; validação de existência é do seed) — ADR-0014.
    parentId: varchar('parent_id', { length: 36 }),
  },
  (t) => [
    check('fin_categories_group_chk', sql`${t.group} IN ('despesa','receita','ajuste')`),
    index('fin_categories_group_name_idx').on(t.group, t.name),
    index('fin_categories_active_idx').on(t.active),
    index('fin_categories_parent_id_idx').on(t.parentId),
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
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
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
export const finOutbox = mysqlTable(
  'fin_outbox',
  {
    // UUID v4 do evento — gerado pelo domínio antes do INSERT (idempotência via PK).
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    // id do agregado dono (documento / conciliação / extrato / período).
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    // 'Document' | 'Reconciliation' | 'Statement' | 'ReconciliationPeriod' — CHECK abaixo.
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
    check(
      'fin_outbox_aggregate_type_chk',
      sql`${t.aggregateType} IN ('Document', 'Reconciliation', 'Statement', 'ReconciliationPeriod')`,
    ),
    // Índice do worker (ADR-0015): processed_at PRIMEIRO → NULLs agrupados → range scan eficiente.
    index('fin_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    index('fin_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

export type FinOutboxRow = typeof finOutbox.$inferSelect;
export type NewFinOutboxRow = typeof finOutbox.$inferInsert;
