# Data Model (Fase 1): Financeiro — Fatia 1 (schema `fin_*`)

**Feature**: `specs/009-fin-documentos-titulos/` · Roteamento: skill `drizzle-schema-author` + `database-engineer`.

> Mapeamentos canônicos **ADR-0020**: UUID em `varchar(36)`, Money em `bigint` (centavos), **sem ENUM nativo**
> (usar `varchar` + CHECK), **sem JSON nativo**, **sem AUTO_INCREMENT** em PK de domínio (UUID gerado pela app),
> **sem UPSERT nativo**. Isolamento `fin_*` (ADR-0014). Migration gerada por `pnpm run db:generate` — nunca à mão.

## Visão geral (agregado `Document`)

```text
fin_documents (raiz)
├── 1—N fin_payables           (Pai/Filho — entidade interna)
├── 1—N fin_retentions         (geram filhos; abatem o líquido)
├── 1—N fin_registered_taxes   (apenas leitura; não abatem)
└── 1—N fin_document_timeline  (read-model Time Travel)
        └── 1—N fin_timeline_field_changes (diff por-campo)
```

Todas as filhas têm FK para `fin_documents(id)` **ON DELETE CASCADE** — o cancelamento em `Open` é hard delete de todo
o boundary do agregado (ADR-0002):

> "A delete operation must remove everything within the AGGREGATE boundary at once."
> — _(ddd--evans-livro-azul.md:1471; Eric Evans, *Domain-Driven Design*)_

> O registro **permanente** de cancelamento é o evento `DocumentCancelled` no outbox (a timeline materializada faz parte
> do boundary e cascateia).

## Tabelas

### `fin_documents`

| Coluna                | Tipo                    | Notas                                                                                                 |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                  | `varchar(36)` PK        | UUID v4 (app)                                                                                         |
| `document_number`     | `varchar(60)`           | nº fiscal (input do usuário)                                                                          |
| `series`              | `varchar(20)` NULL      | série fiscal                                                                                          |
| `type`                | `varchar(16)`           | CHECK ∈ {NFS-e, DANFE, RPA, Fatura, Boleto, Recibo, Imposto}                                          |
| `supplier_ref`        | `varchar(36)`           | obrigatório (UUID de `partners`)                                                                      |
| `contract_ref`        | `varchar(36)` NULL      | ref leve                                                                                              |
| `budget_plan_ref`     | `varchar(36)` NULL      | ref leve (sem dono — ADR-0001)                                                                        |
| `category_ref`        | `varchar(36)` NULL      | ref leve (sem dono)                                                                                   |
| `program_ref`         | `varchar(36)` NULL      | ref leve                                                                                              |
| `payment_method`      | `varchar(24)`           | CHECK ∈ {TED, TransferenciaBancaria, PIX, Boleto, CartaoCorporativo, Cambio, GuiaRecolhimento, Outro} |
| `gross_value`         | `bigint`                | centavos                                                                                              |
| `source_discounts`    | `bigint` default 0      | descontos na fonte                                                                                    |
| `discounts`           | `bigint` default 0      | descontos comerciais                                                                                  |
| `penalty`             | `bigint` default 0      | multa                                                                                                 |
| `interest`            | `bigint` default 0      | juros                                                                                                 |
| `net_value`           | `bigint`                | **derivado** (não digitado)                                                                           |
| `status`              | `varchar(16)`           | CHECK ∈ {Draft, Open, Approved, Transmitted, Refused, Paid, Reconciled} — 7 valores (ADR-0005)        |
| `description`         | `varchar(500)` NULL     | editável pós-aprovação                                                                                |
| `due_date`            | `date` NULL             | obrigatório a partir de `Open`                                                                        |
| `read_by_ocr`         | `boolean` default false | metadado de origem                                                                                    |
| `ocr_original_value`  | `bigint` NULL           | valor lido pelo OCR (soberania do documento)                                                          |
| `divergence_detected` | `boolean` default false | sinalização de divergência                                                                            |
| `version`             | `int` default 0         | optimistic lock (R5)                                                                                  |
| `created_at`          | `datetime`              |                                                                                                       |
| `approved_at`         | `datetime` NULL         |                                                                                                       |
| `approved_by`         | `varchar(36)` NULL      | UserRef                                                                                               |

**Índices**: `idx_fin_doc_supplier (supplier_ref)`, `idx_fin_doc_status (status)`, `idx_fin_doc_due (due_date)`,
`idx_fin_doc_number (document_number)`.

### `fin_payables`

| Coluna           | Tipo                                               | Notas                                               |
| ---------------- | -------------------------------------------------- | --------------------------------------------------- |
| `id`             | `varchar(36)` PK                                   |                                                     |
| `document_id`    | `varchar(36)` FK→`fin_documents` ON DELETE CASCADE |                                                     |
| `kind`           | `varchar(8)`                                       | CHECK ∈ {Parent, Child}                             |
| `retention_type` | `varchar(8)` NULL                                  | CHECK ∈ {ISS, IRRF, INSS, CSRF}; só em `Child`      |
| `status`         | `varchar(16)`                                      | CHECK (7 valores — espelha o documento nesta fatia) |
| `value`          | `bigint`                                           | Pai = net_value; Filho = retention.value            |
| `due_date`       | `date`                                             |                                                     |
| `payment_method` | `varchar(24)`                                      | CHECK                                               |
| `created_at`     | `datetime`                                         |                                                     |

**Índices**: `idx_fin_pay_doc (document_id)`, `idx_fin_pay_status (status)`.

### `fin_retentions` (geram filhos; abatem o líquido)

| Coluna        | Tipo                               | Notas                                                    |
| ------------- | ---------------------------------- | -------------------------------------------------------- |
| `id`          | `varchar(36)` PK                   |                                                          |
| `document_id` | `varchar(36)` FK ON DELETE CASCADE |                                                          |
| `type`        | `varchar(8)`                       | CHECK ∈ {ISS, IRRF, INSS, CSRF}                          |
| `base`        | `bigint`                           | base de cálculo (centavos)                               |
| `rate_bps`    | `int`                              | alíquota em basis points (ex.: 1100 = 11%) — evita float |
| `value`       | `bigint`                           | centavos                                                 |

**Índice**: `idx_fin_ret_doc (document_id)`.

### `fin_registered_taxes` (apenas leitura; não abatem)

| Coluna        | Tipo                               | Notas                                                              |
| ------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `id`          | `varchar(36)` PK                   |                                                                    |
| `document_id` | `varchar(36)` FK ON DELETE CASCADE |                                                                    |
| `type`        | `varchar(16)`                      | CHECK ∈ {ICMS, IPI, PIS, COFINS, CBS, IBS_Municipal, IBS_Estadual} |
| `base`        | `bigint`                           |                                                                    |
| `rate_bps`    | `int`                              |                                                                    |
| `value`       | `bigint`                           |                                                                    |

### `fin_document_timeline` (read-model materializado — R2)

| Coluna        | Tipo                               | Notas                                                                                 |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| `id`          | `varchar(36)` PK                   |                                                                                       |
| `event_id`    | `varchar(36)`                      | liga ao evento do outbox (idempotência)                                               |
| `document_id` | `varchar(36)` FK ON DELETE CASCADE | agrupa por documento                                                                  |
| `target_kind` | `varchar(8)`                       | CHECK ∈ {Document, Payable}                                                           |
| `target_id`   | `varchar(36)`                      | id do alvo                                                                            |
| `event_type`  | `varchar(40)`                      | DocumentSaved, PayableApproved, ApprovalUndone, DocumentCancelled, DocumentDraftSaved |
| `occurred_at` | `datetime`                         |                                                                                       |
| `actor_ref`   | `varchar(36)` NULL                 | UserRef (best-effort)                                                                 |

**Índices**: `idx_fin_tl_doc_time (document_id, occurred_at)`, `idx_fin_tl_target (target_id)`.

### `fin_timeline_field_changes` (diff por-campo — sem JSON, ADR-0020)

| Coluna              | Tipo                                                       | Notas                                  |
| ------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `id`                | `varchar(36)` PK                                           |                                        |
| `timeline_entry_id` | `varchar(36)` FK→`fin_document_timeline` ON DELETE CASCADE |                                        |
| `field`             | `varchar(60)`                                              | nome do campo (EN)                     |
| `before_value`      | `text` NULL                                                | valor anterior (serializado p/ string) |
| `after_value`       | `text` NULL                                                | valor novo                             |

> Decomposição em tabela filha (1ª forma normal: valores atômicos, sem grupo repetido) em vez de coluna JSON —
> exigido por ADR-0020 e idiomático para consulta/auditoria.

## Snippet Drizzle (ilustrativo — `adapters/persistence/schemas/mysql.ts`)

```ts
import {
  mysqlTable,
  varchar,
  bigint,
  int,
  boolean,
  datetime,
  date,
  index,
  check,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const finDocuments = mysqlTable(
  'fin_documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    documentNumber: varchar('document_number', { length: 60 }).notNull(),
    type: varchar('type', { length: 16 }).notNull(),
    supplierRef: varchar('supplier_ref', { length: 36 }).notNull(),
    contractRef: varchar('contract_ref', { length: 36 }),
    budgetPlanRef: varchar('budget_plan_ref', { length: 36 }),
    categoryRef: varchar('category_ref', { length: 36 }),
    programRef: varchar('program_ref', { length: 36 }),
    paymentMethod: varchar('payment_method', { length: 24 }).notNull(),
    grossValue: bigint('gross_value', { mode: 'bigint' }).notNull(),
    netValue: bigint('net_value', { mode: 'bigint' }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    version: int('version').notNull().default(0),
    createdAt: datetime('created_at').notNull(),
    // ... (demais colunas acima)
  },
  (t) => [
    index('idx_fin_doc_supplier').on(t.supplierRef),
    index('idx_fin_doc_status').on(t.status),
    check(
      'ck_fin_doc_type',
      sql`${t.type} in ('NFS-e','DANFE','RPA','Fatura','Boleto','Recibo','Imposto')`,
    ),
    check(
      'ck_fin_doc_status',
      sql`${t.status} in ('Draft','Open','Approved','Transmitted','Refused','Paid','Reconciled')`,
    ),
  ],
);
// $inferSelect / $inferInsert exportados p/ os mappers (reidratação via smart constructors — ts-domain-modeler §3.A.4)
```

## Invariantes no banco vs domínio

- O **cálculo do líquido** e a **geração de filhos** são do domínio (puro) — o banco só persiste o resultado.
- CHECKs cobrem o conjunto de valores válidos (defesa em profundidade); a máquina de estados é imposta pelo domínio.
- **Optimistic lock**: `UPDATE fin_documents SET ..., version = version + 1 WHERE id = ? AND version = ?` (R5; sem UPSERT — ADR-0020).
- **Hard delete** (cancelamento em `Open`): `DELETE FROM fin_documents WHERE id = ?` → CASCADE remove payables/retentions/taxes/timeline.

## Migration

Editar `src/modules/financial/adapters/persistence/schemas/mysql.ts` → `pnpm run db:generate` → versionar a migration
inicial `fin_*` em `adapters/persistence/migrations/mysql/`. CHARSET/COLLATE e FK ON DELETE conferidos manualmente no SQL gerado.
