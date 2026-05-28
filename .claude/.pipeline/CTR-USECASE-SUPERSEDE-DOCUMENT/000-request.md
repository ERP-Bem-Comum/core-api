# 000 — Request CTR-USECASE-SUPERSEDE-DOCUMENT

> **Use case `supersedeDocument` + schema migration + mapper + state validator + CLI command. Size M.**
> Completa as CAs adiadas em `CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE`: persistência do estado `Superseded` ponta-a-ponta. Espelha exatamente o pipeline do `CTR-USECASE-DELETE-DOCUMENT`.

## Decisões fixadas

### 1. Use case signature

```ts
export type SupersedeDocumentCommand = Readonly<{
  documentId: string;
  supersededByDocumentId: string;
  supersededBy: string;
}>;

export type SupersedeDocumentOutput = Readonly<{
  document: SupersededContractDocument;
  event: ContractDocumentSupersededEvent;
}>;

export type SupersedeDocumentError =
  | DocumentIdError
  | UserRefError
  | 'document-not-found'
  | 'supersede-target-not-found'
  | 'document-already-deleted'
  | 'document-already-superseded'
  | ContractDocumentError
  | DocumentRepositoryError;
```

### 2. Sequência canônica

1. Validar `documentId` via `DocumentId.rehydrate`
2. Validar `supersededByDocumentId` via `DocumentId.rehydrate`
3. Validar `supersededBy` via `UserRef.rehydrate`
4. `documentRepo.findById(documentId)` — null → `'document-not-found'`
5. `documentRepo.findById(supersededByDocumentId)` — null → `'supersede-target-not-found'`
6. Switch sobre `doc.status`:
   - `'Active'` → seguir
   - `'LogicallyDeleted'` → `'document-already-deleted'`
   - `'Superseded'` → `'document-already-superseded'`
7. `Document.supersede(active, byDocId, by, clock.now())`
8. `documentRepo.save(superseded, [event])`

### 3. Schema MySQL — 3 colunas nullable + CHECK consistência

```ts
supersededAt: datetime('superseded_at', { mode: 'date', fsp: 3 }),
supersededBy: char('superseded_by', { length: 36 }),
supersededByDocumentId: char('superseded_by_document_id', { length: 36 }),

check(
  'ctr_documents_superseded_chk',
  sql`${t.status} <> 'Superseded'
      OR (${t.supersededAt} IS NOT NULL
          AND ${t.supersededBy} IS NOT NULL
          AND ${t.supersededByDocumentId} IS NOT NULL)`,
),
```

### 4. Mapper discriminate

Branch `Superseded` ativo (anteriormente era erro `not-implemented`). De `from`: lê 3 campos. De `to`: serializa null para Active/LogicallyDeleted; valores para Superseded.

### 5. State validator estendido

`isValidContractDocument` aceita `status='Superseded'` com shape de 3 campos audit obrigatórios.

`DATE_KEYS` ganha `'supersededAt'`.

### 6. CLI command `substituir-documento`

```
Uso: substituir-documento --documento <uuid> --substituido-por <uuid> [--user-id <uuid>]
```

## Escopo + CAs

| CA | Item |
| :--- | :--- |
| CA1 | Use case factory `supersedeDocument(deps)(cmd)` |
| CA2 | Errors: `not-found`, `supersede-target-not-found`, `already-deleted`, `already-superseded` |
| CA3 | Schema + migration 0004 + 3 colunas + CHECK |
| CA4 | Mapper round-trip Superseded |
| CA5 | State validator aceita Superseded |
| CA6 | CLI command registrado |
| CA7 | 6 tests CA-SUP1..SUP6 |
| CA8 | Gates W3 verdes |
| CA9 | Zero regressão |

### Tests CA-SUP1..SUP6

- SUP1: happy → ok com Superseded
- SUP2: documentId inexistente → `document-not-found`
- SUP3: supersededByDocumentId inexistente → `supersede-target-not-found`
- SUP4: documento já deletado → `document-already-deleted`
- SUP5: documento já substituído → `document-already-superseded`
- SUP6: byDocId === documentId → propaga `document-supersede-self` (do domain)

## Não-objetivos

- Validar que o documento substituto é `Active` (poderia exigir, mas trade-off de complexidade — aceitar qualquer documento existente).
- BDD E2E test — opcional.
