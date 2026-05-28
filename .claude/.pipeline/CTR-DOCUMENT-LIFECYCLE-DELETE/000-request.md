# 000 — Request CTR-DOCUMENT-LIFECYCLE-DELETE

> **Exclusão lógica do agregado ContractDocument (RN-11). Size S.**
> Implementa spec §13.3 evento `DocumentoContratualExcluido` (EN: `ContractDocumentDeleted`).
> Estende refined type `ContractDocument` com variante `'LogicallyDeleted'` + operação `logicallyDelete(active, reason, by, at)`.

## Justificativa

Spec §4.3 lista campos de exclusão lógica (`excluido_logicamente`, `motivoExclusao`). Spec RN-11: "Exclusão de documento não apaga o histórico — deve ser lógica ou controlada, preservando auditoria, motivo e usuário executor."

`CTR-DOCUMENT-AGGREGATE-PERSISTENCE` já reservou o status `'LogicallyDeleted'` no CHECK constraint do schema. Falta o domain modelar a transição + persistir os 3 campos audit (`deletedAt`, `deletedBy`, `deletedReason`).

## Decisões fixadas

### 1. Refined type union estendida

```ts
export type ActiveContractDocument = ContractDocumentCore & Readonly<{ status: 'Active' }>;

export type LogicallyDeletedContractDocument = ContractDocumentCore &
  Readonly<{
    status: 'LogicallyDeleted';
    deletedAt: Date;
    deletedBy: UserRef;
    deletedReason: string;
  }>;

export type ContractDocument = ActiveContractDocument | LogicallyDeletedContractDocument;
```

Padrão "campos optional-as-state viram propriedade do tipo refinado" (DO C§29). Active nunca tem deletedAt; LogicallyDeleted sempre tem os 3 campos.

### 2. Operação `Document.logicallyDelete`

```ts
export type DeleteResult = Readonly<{
  document: LogicallyDeletedContractDocument;
  event: ContractDocumentDeletedEvent;
}>;

export const logicallyDelete = (
  active: ActiveContractDocument,
  reason: string,
  by: UserRef,
  at: Date,
): Result<DeleteResult, ContractDocumentError>;
```

Validações:
- `reason` não-vazio (1..500 chars)
- `at >= active.uploadedAt`

Assinatura aceita **somente** `ActiveContractDocument` — compilador rejeita tentativa de re-deletar (DO D§20).

### 3. Evento `ContractDocumentDeleted`

```ts
export type ContractDocumentDeletedEvent = Readonly<{
  type: 'ContractDocumentDeleted';
  documentId: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  deletedBy: UserRef;
  deletedReason: string;
  occurredAt: Date;
}>;
```

Shape domain event (campos brandeds + occurredAt). Adicionado ao union `DocumentEvent` + `ContractsModuleEvent` + `KNOWN_EVENT_TYPES` + outbox mapper.

### 4. Errors estendidos

```ts
export type ContractDocumentError =
  // existentes:
  | 'document-invalid-file-name'
  | 'document-empty-mime-type'
  | 'document-negative-size'
  | 'document-invalid-hash-sha256'
  | 'document-invalid-version'
  | 'document-retention-before-upload'
  // novos:
  | 'document-empty-delete-reason'
  | 'document-delete-reason-too-long'
  | 'document-delete-before-upload';
```

### 5. Schema MySQL — 3 colunas nullable + 1 migration nova

```ts
deletedAt: datetime('deleted_at', { mode: 'date', fsp: 3 }),       // nullable
deletedBy: char('deleted_by', { length: 36 }),                       // nullable, FK lógica para UserRef
deletedReason: varchar('deleted_reason', { length: 500 }),           // nullable
```

CHECK constraint adicional (consistência por status):
```sql
ctr_documents_logically_deleted_chk:
  status <> 'LogicallyDeleted'
  OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deleted_reason IS NOT NULL)
```

Migration `0003_*.sql` via `drizzle-kit generate` + hardening manual (`utf8mb4_bin` em `deleted_by`).

### 6. Mapper row ↔ domain

`documentFromRow` precisa discriminar status e popular campos opcionais conforme variante. `documentToInsert` serializa null/undefined conforme status='Active'.

### 7. Outbox mapper

`ContractDocumentDeletedPayload` + handlers serialize/deserialize. `extractAggregateInfo` já cobre `'Document'` aggregate type.

### 8. State validator (CLI memory)

`isValidContractDocument` precisa aceitar `status='LogicallyDeleted'` + validar shape dos 3 novos campos quando presente.

`DATE_KEYS` ganha `'deletedAt'`.

## Escopo

### Arquivos modificar

| Arquivo | Mudança |
| :--- | :--- |
| `domain/document/types.ts` | + `ActiveContractDocument`, `LogicallyDeletedContractDocument`, union estendida |
| `domain/document/document.ts` | + `logicallyDelete(active, reason, by, at)` operação |
| `domain/document/events.ts` | + `ContractDocumentDeletedEvent` no union `DocumentEvent` |
| `domain/document/errors.ts` | + 3 erros novos |
| `adapters/persistence/schemas/mysql.ts` | + 3 colunas nullable + CHECK consistência |
| `adapters/persistence/mappers/document.mapper.ts` | + discriminação por status |
| `adapters/persistence/mappers/outbox.mapper.ts` | + handlers ContractDocumentDeleted |
| `cli/state.ts` | + validator estendido + DATE_KEYS deletedAt |
| `public-api/events.ts` | + `'ContractDocumentDeleted'` em KNOWN_EVENT_TYPES |

### Arquivo criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `migrations/mysql/0003_*.sql` | gerada via drizzle-kit + hardening manual |
| `tests/modules/contracts/domain/document/lifecycle-delete.test.ts` | tests CA-D1..D6 do logicallyDelete |

## Critérios de aceitação

- **CA1** — `ActiveContractDocument` (refined: status='Active', sem deleted*) e `LogicallyDeletedContractDocument` (refined: status='LogicallyDeleted', com deletedAt/deletedBy/deletedReason).
- **CA2** — `Document.logicallyDelete(active, reason, by, at)` aceita **somente** `ActiveContractDocument` (compile-time exhaustiveness).
- **CA3** — Validações: reason 1..500 chars, `at >= active.uploadedAt`.
- **CA4** — Evento `ContractDocumentDeleted` shape domain (campos brandeds + occurredAt). Union `DocumentEvent` estendido.
- **CA5** — Schema + migration adiciona 3 colunas nullable + CHECK consistência (`status='LogicallyDeleted' ⟹ deleted_*` preenchidos).
- **CA6** — Mapper round-trip: salvar LogicallyDeleted + ler → mesmo agregado.
- **CA7** — Outbox mapper serialize/deserialize `ContractDocumentDeleted`.
- **CA8** — State validator aceita `status='LogicallyDeleted'` + shape correto.
- **CA9** — Tests CA-D1..D6 verdes:
  - D1: logicallyDelete válido → ok(DeleteResult com status='LogicallyDeleted' + 3 campos)
  - D2: reason vazio → err document-empty-delete-reason
  - D3: reason > 500 chars → err document-delete-reason-too-long
  - D4: at < uploadedAt → err document-delete-before-upload
  - D5: evento emitido com payload completo
  - D6: smoke type — logicallyDelete só aceita ActiveContractDocument (compile)
- **CA10** — Gates W3 verdes.

## Não-objetivos

- **Use case `deleteDocument`** — fica para futuro ticket `CTR-USECASE-DELETE-DOCUMENT`. Por enquanto, expor apenas a operação de domínio.
- **CLI command `excluir-documento`** — fica para futuro.
- **Substituição/versionamento (`Superseded`)** — ticket separado `CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE`.
- **Hard delete** — fora de escopo (RN-11 exige exclusão lógica).
- **Retention enforcement** — apenas armazena `retentionUntil`; trigger de exclusão automática é trabalho operacional fora deste ticket.

## Risco

1. **Schema migration nova** — 3 colunas nullable em tabela existente. Operação ALTER TABLE; aceitar downtime mínimo em prod (drizzle-kit gera).
2. **Mapper precisa discriminar** — `documentFromRow` agora retorna union. Possível complicação no `findById` que tipa como `ContractDocument | null` — TypeScript narrow correto.
3. **Backward compat com state files antigos** — documents existentes têm `status='Active'` sem deleted_*. Validator + reviver garantem compat.
4. **Refined type union pode complicar consumers** — quem só queria `ContractDocument` agora tem que narrow por status. Decisão: aceitar — DO D§21 exige.
