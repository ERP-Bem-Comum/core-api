# Data Model (Fase 1): Financeiro — Fatia 2: Listagem + Trilha por-campo (schema `fin_*`)

**Feature**: `specs/010-fin-listagem-timeline/`. Skill: `drizzle-schema-author` + `database-engineer`/`mysql-database-expert`.

> Mapeamentos canônicos **ADR-0020**: UUID `varchar(36)` (`utf8mb4_bin`), Money `bigint` (centavos), **sem ENUM/JSON
> nativo**, sem AUTO*INCREMENT em PK de domínio. Isolamento `fin*\*`(ADR-0014). Migration via`pnpm run db:generate`(config`drizzle.config.financial.ts`) — CHARSET/COLLATE/FK conferidos manualmente no SQL.

## Novas tabelas (materialização da trilha — desenho herdado de data-model 009 §read-model)

```text
fin_documents (fatia 1)
└── 1—N fin_document_timeline        (read-model Time Travel — NOVO nesta fatia)
        └── 1—N fin_timeline_field_changes (diff por-campo 1FN — NOVO nesta fatia)
```

### `fin_document_timeline`

| Coluna        | Tipo                                               | Notas                                                                                           |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `id`          | `varchar(36)` PK                                   | UUID v4 (app)                                                                                   |
| `event_id`    | `varchar(36)`                                      | idempotência: liga ao evento de domínio que originou o marco                                    |
| `document_id` | `varchar(36)` FK→`fin_documents` ON DELETE CASCADE | agrupa por documento (cascade no hard delete do cancelamento — Evans:1471)                      |
| `target_kind` | `varchar(8)`                                       | CHECK ∈ {Document, Payable}                                                                     |
| `target_id`   | `varchar(36)`                                      | id do alvo (documento ou título)                                                                |
| `event_type`  | `varchar(40)`                                      | CHECK ∈ {DocumentSaved, PayableApproved, ApprovalUndone, DocumentCancelled, DocumentDraftSaved} |
| `occurred_at` | `datetime(3)`                                      | instante do marco (Clock)                                                                       |
| `actor_ref`   | `varchar(36)` NULL                                 | UserRef (best-effort)                                                                           |

**Índices**: `idx_fin_tl_doc_time (document_id, occurred_at)` — leitura cronológica do `GET /timeline`;
`idx_fin_tl_target (target_id)`.

### `fin_timeline_field_changes`

| Coluna              | Tipo                                                       | Notas                                       |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `id`                | `varchar(36)` PK                                           |                                             |
| `timeline_entry_id` | `varchar(36)` FK→`fin_document_timeline` ON DELETE CASCADE | cascade dupla (documento → entry → changes) |
| `field`             | `varchar(60)`                                              | nome do campo de domínio (EN)               |
| `before_value`      | `text` NULL                                                | valor anterior serializado (string)         |
| `after_value`       | `text` NULL                                                | valor novo serializado                      |

**Índice**: `idx_fin_tlfc_entry (timeline_entry_id)`.

> Diff decomposto em tabela filha (1ª forma normal — valores atômicos) em vez de coluna JSON: exigido por ADR-0020 e
> idiomático para consulta/auditoria.

## Índice para a listagem (`findPaged`)

A fatia 1 já criou: `idx_fin_doc_status`, `idx_fin_doc_supplier`, `idx_fin_doc_due`, `idx_fin_doc_number`.

- **Decisão**: avaliar índice composto `idx_fin_doc_status_due (status, due_date)` para o filtro mais comum
  (situação + janela de vencimento), validado por `EXPLAIN` (database-engineer). Se o ganho não se confirmar no volume da
  carteira (~10³), manter os índices simples existentes (evitar índice redundante).
- **`total`**: `COUNT(*)` com o mesmo `WHERE` dos filtros; `LIMIT ? OFFSET ?` para o recorte. OFFSET aceitável na escala
  atual; keyset pagination fica como evolução se as métricas (MP-003) acusarem custo.

## Snippet Drizzle (ilustrativo — `adapters/persistence/schemas/mysql.ts`, append às tabelas da fatia 1)

```ts
export const finDocumentTimeline = mysqlTable(
  'fin_document_timeline',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    eventId: varchar('event_id', { length: 36 }).notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),
    targetKind: varchar('target_kind', { length: 8 }).notNull(),
    targetId: varchar('target_id', { length: 36 }).notNull(),
    eventType: varchar('event_type', { length: 40 }).notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    actorRef: varchar('actor_ref', { length: 36 }),
  },
  (t) => [
    index('idx_fin_tl_doc_time').on(t.documentId, t.occurredAt),
    index('idx_fin_tl_target').on(t.targetId),
    check('ck_fin_tl_target_kind', sql`${t.targetKind} in ('Document','Payable')`),
    check(
      'ck_fin_tl_event_type',
      sql`${t.eventType} in ('DocumentSaved','PayableApproved','ApprovalUndone','DocumentCancelled','DocumentDraftSaved')`,
    ),
  ],
);

export const finTimelineFieldChanges = mysqlTable(
  'fin_timeline_field_changes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    timelineEntryId: varchar('timeline_entry_id', { length: 36 }).notNull(),
    field: varchar('field', { length: 60 }).notNull(),
    beforeValue: text('before_value'),
    afterValue: text('after_value'),
  },
  (t) => [index('idx_fin_tlfc_entry').on(t.timelineEntryId)],
);
// FKs ON DELETE CASCADE (document_id → fin_documents; timeline_entry_id → fin_document_timeline)
// conferidas/inseridas manualmente no SQL gerado (Drizzle 0.45 não expõe table-level charset).
// $inferSelect/$inferInsert exportados p/ os mappers (reidratação via smart constructors).
```

## Invariantes no banco vs domínio

- A trilha é **derivada** (read-model): o domínio calcula o diff (função pura) e o repo persiste; o banco só materializa.
- **Atomicidade**: entry + changes gravados na MESMA transação do agregado (`db.transaction`) — rollback remove tudo.
- **Append-only**: a fatia não faz UPDATE/DELETE em linhas de trilha (só INSERT); a única remoção é o CASCADE do
  cancelamento (hard delete do documento).
- **Optimistic lock** (sem migration — coluna `version` já existe): `UPDATE fin_documents SET ..., version=version+1 WHERE id=? AND version=?`.

## Migration

Editar `schemas/mysql.ts` (append das 2 tabelas) → `pnpm run db:generate` → versionar a nova migration `fin_*` em
`adapters/persistence/migrations/mysql/`. Sem alteração nas tabelas da fatia 1 (apenas adição).
