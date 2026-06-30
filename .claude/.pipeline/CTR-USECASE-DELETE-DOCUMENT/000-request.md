# 000 — Request CTR-USECASE-DELETE-DOCUMENT

> **Use case `deleteDocument` + schema migration + mapper + state validator + CLI command. Size M.**
> Completa as CAs adiadas em `CTR-DOCUMENT-LIFECYCLE-DELETE`: persistência do estado `LogicallyDeleted` ponta-a-ponta.

## Justificativa

`CTR-DOCUMENT-LIFECYCLE-DELETE` (S) entregou apenas domain + outbox mapper. Agora precisamos:

- **Schema MySQL** — adicionar 3 colunas nullable (`deleted_at`, `deleted_by`, `deleted_reason`) + CHECK consistência (`status='LogicallyDeleted' ⟹ campos preenchidos`)
- **Migration `0003_*.sql`** — ALTER TABLE via drizzle-kit + hardening
- **`document.mapper.ts`** — discriminar por status no row↔domain
- **`state.ts` validator** — aceitar `LogicallyDeleted` com shape correto
- **Use case `deleteDocument`** — orquestra repo.findById → discriminar status → `Document.logicallyDelete` → repo.save com evento
- **CLI command `excluir-documento`** — `--documento --motivo --user-id`

## Decisões fixadas

### 1. Use case signature

```ts
export type DeleteDocumentCommand = Readonly<{
  documentId: string;       // UUID raw
  deletedReason: string;
  deletedBy: string;        // UUID raw
}>;

export type DeleteDocumentOutput = Readonly<{
  document: LogicallyDeletedContractDocument;
  event: ContractDocumentDeletedEvent;
}>;

export type DeleteDocumentError =
  | DocumentIdError
  | UserRefError
  | 'document-not-found'
  | 'document-already-deleted'
  | 'document-already-superseded'
  | ContractDocumentError
  | DocumentRepositoryError;
```

### 2. Sequência canônica

1. Validar `documentId` via `DocumentId.rehydrate`
2. Validar `deletedBy` via `UserRef.rehydrate`
3. `documentRepo.findById(documentId)` — null → `'document-not-found'`
4. Switch sobre `doc.status`:
   - `'Active'` → seguir
   - `'LogicallyDeleted'` → `'document-already-deleted'`
   - `'Superseded'` → `'document-already-superseded'`
5. `Document.logicallyDelete(active, reason, by, clock.now())`
6. `documentRepo.save(deletedDoc, [event])` (outbox via repo)
7. Retornar `{ document, event }`

### 3. Schema MySQL — 3 colunas nullable + CHECK consistência

```ts
deletedAt: datetime('deleted_at', { mode: 'date', fsp: 3 }),       // nullable
deletedBy: char('deleted_by', { length: 36 }),                       // nullable
deletedReason: varchar('deleted_reason', { length: 500 }),           // nullable

check(
  'ctr_documents_logically_deleted_chk',
  sql`${t.status} <> 'LogicallyDeleted'
      OR (${t.deletedAt} IS NOT NULL AND ${t.deletedBy} IS NOT NULL AND ${t.deletedReason} IS NOT NULL)`,
),
```

### 4. Mapper discriminate

`documentFromRow` retorna union (Active | LogicallyDeleted | Superseded conforme `row.status`). Para deste ticket, apenas Active e LogicallyDeleted (Superseded fica para ticket SUPERSEDE).

`documentToInsert` aceita union. Active → null nos campos deleted; LogicallyDeleted → valores; Superseded → null nos deleted (campos superseded vêm no ticket SUPERSEDE).

### 5. State validator estendido

`isValidContractDocument` aceita `status='Active'` (existente) E `status='LogicallyDeleted'` (novo, com shape de 3 campos audit obrigatórios).

`DATE_KEYS` ganha `'deletedAt'`.

### 6. CLI command `excluir-documento`

```
Uso: excluir-documento --documento <uuid> --motivo <texto> [--user-id <uuid>]
```

## Escopo

### Source modificar

| Arquivo | Mudança |
| :--- | :--- |
| `adapters/persistence/schemas/mysql.ts` | + 3 colunas nullable + CHECK consistência |
| `adapters/persistence/mappers/document.mapper.ts` | discriminate por status no from/to |
| `cli/state.ts` | + `LogicallyDeleted` no validator + `deletedAt` em DATE_KEYS |
| `cli/registry.ts` | + `excluir-documento` |

### Source criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `application/use-cases/delete-document.ts` | use case factory |
| `cli/commands/excluir-documento.ts` | comando CLI |
| `migrations/mysql/0003_*.sql` | gerada via drizzle-kit + hardening |

### Tests criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `tests/modules/contracts/application/use-cases/delete-document.test.ts` | 5 tests CA-DEL1..DEL5 |

## Critérios de aceitação

- **CA1** — Use case factory `deleteDocument(deps)(cmd)` sequência canônica.
- **CA2** — Errors discriminados: `document-not-found`, `document-already-deleted`, `document-already-superseded`.
- **CA3** — Schema + migration adicionam 3 colunas + CHECK consistência.
- **CA4** — Mapper round-trip: Active OR LogicallyDeleted persiste e recupera campo-a-campo.
- **CA5** — State validator aceita `'LogicallyDeleted'` com shape correto.
- **CA6** — CLI command `excluir-documento` registrado e funcional.
- **CA7** — Tests CA-DEL1..DEL5 verdes:
  - DEL1: happy path → ok com LogicallyDeleted + event
  - DEL2: documento inexistente → `document-not-found`
  - DEL3: documento já deletado → `document-already-deleted`
  - DEL4: reason vazio → `document-empty-delete-reason` (do domain)
  - DEL5: repo.save falha → propagado
- **CA8** — Gates W3 verdes.
- **CA9** — Suite global mantém zero regressão.

## Não-objetivos

- **`CTR-USECASE-SUPERSEDE-DOCUMENT`** — análogo para Superseded.
- **Forecast retention via cron** — RN-11 menciona `retencaoAte`, mas exclusão automática por retenção é trabalho operacional fora do escopo.
- **HTTP endpoint** — Fase 2+.
- **BDD E2E test** — opcional; CLI command já testável manualmente.

## Risco

1. **Migration nova com ALTER TABLE** — 3 colunas nullable + CHECK. Risk-free em DB vazio; revisitar se houver dado existente.
2. **Mapper agora retorna union** — consumers do `documentRepo.findById` precisam narrow por status. `attachSignedDocument` (use case existente) chama `findById` — verificar compat.
3. **CHECK consistência** — Postgres+MySQL diferem em CHECK enforcement. MySQL 8 valida CHECKs por default desde 8.0.16.
