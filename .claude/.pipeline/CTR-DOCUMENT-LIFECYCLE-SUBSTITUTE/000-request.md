# 000 — Request CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE

> **Substituição/versionamento do agregado ContractDocument (RN-AS-02). Size S.**
> Espelha `CTR-DOCUMENT-LIFECYCLE-DELETE` com semântica de substituição: documento `Active` → `Superseded` com ponteiro para a versão substituta.

## Justificativa

Spec §4.3 lista campos `versaoDocumento` + `substituido`. RN-AS-02: "permitir armazenar hash, versão e evidências de validação do documento assinado." Quando um documento é substituído por nova versão, o documento antigo NÃO deve ser apagado — fica como histórico imutável com status `'Superseded'` + ponteiro para o substituto.

Schema MySQL já reservou `'Superseded'` no CHECK constraint do `status`. Falta o domain modelar a transição.

## Decisões fixadas

### 1. Refined type adicional

```ts
export type SupersededContractDocument = ContractDocumentCore &
  Readonly<{
    status: 'Superseded';
    supersededAt: Date;
    supersededBy: UserRef;
    supersededByDocumentId: DocumentId;
  }>;

export type ContractDocument =
  | ActiveContractDocument
  | LogicallyDeletedContractDocument
  | SupersededContractDocument;
```

### 2. Operação `Document.supersede`

```ts
export type SupersedeResult = Readonly<{
  document: SupersededContractDocument;
  event: ContractDocumentSupersededEvent;
}>;

export const supersede = (
  active: ActiveContractDocument,
  supersededByDocumentId: DocumentId,
  by: UserRef,
  at: Date,
): Result<SupersedeResult, ContractDocumentError>;
```

Aceita SOMENTE `ActiveContractDocument` (compile-time exhaustiveness). Padrão alinhado com `logicallyDelete`.

Validações:
- `supersededByDocumentId !== active.id` (não pode substituir por si próprio)
- `at >= active.uploadedAt`

### 3. Evento `ContractDocumentSuperseded`

```ts
export type ContractDocumentSupersededEvent = Readonly<{
  type: 'ContractDocumentSuperseded';
  documentId: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  supersededBy: UserRef;
  supersededByDocumentId: DocumentId;
  occurredAt: Date;
}>;
```

Adicionado ao union `DocumentEvent` + `ContractsModuleEvent` + `KNOWN_EVENT_TYPES` + outbox mapper (serialize + deserialize).

### 4. Errors novos

```ts
| 'document-supersede-self'         // supersededByDocumentId === active.id
| 'document-supersede-before-upload' // at < active.uploadedAt
```

### 5. Persistência adiada (mesma decisão de DELETE)

Schema migration + document.mapper extension + state validator ficam para `CTR-USECASE-SUPERSEDE-DOCUMENT` (M, futuro). Sem use case chamando `Document.supersede`, schema migration seria código morto.

## Escopo

### Arquivos modificar

| Arquivo | Mudança |
| :--- | :--- |
| `domain/document/types.ts` | + `SupersededContractDocument`; union estendido |
| `domain/document/document.ts` | + `supersede(active, byDocId, by, at)` operação |
| `domain/document/events.ts` | + `ContractDocumentSupersededEvent` no union `DocumentEvent` |
| `domain/document/errors.ts` | + 2 erros (`supersede-self`, `supersede-before-upload`) |
| `adapters/persistence/mappers/outbox.mapper.ts` | + serialize/deserialize handlers + case em `extractAggregateInfo` |
| `public-api/events.ts` | + `'ContractDocumentSuperseded'` em `KNOWN_EVENT_TYPES` |

### Arquivo criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `tests/modules/contracts/domain/document/lifecycle-supersede.test.ts` | 6 tests CA-S1..S6 |

## Critérios de aceitação

- **CA1** — `SupersededContractDocument` refined type com `supersededAt: Date`, `supersededBy: UserRef`, `supersededByDocumentId: DocumentId`.
- **CA2** — `Document.supersede(active, byDocId, by, at)` aceita SOMENTE `ActiveContractDocument` (compile-time).
- **CA3** — Validações: `byDocId !== active.id`, `at >= active.uploadedAt`.
- **CA4** — Evento `ContractDocumentSuperseded` shape domain.
- **CA5** — Outbox mapper serialize + deserialize completos.
- **CA6** — `KNOWN_EVENT_TYPES` atualizado.
- **CA7** — 6 tests CA-S1..S6 verdes:
  - S1: supersede válido → ok(SupersedeResult) com refined Superseded + 3 campos
  - S2: byDocId === active.id → err document-supersede-self
  - S3: at < uploadedAt → err document-supersede-before-upload
  - S4: emite evento com payload completo
  - S5: smoke type — supersede só aceita ActiveContractDocument
  - S6: Superseded != LogicallyDeleted (compile-time discrimination)
- **CA8** — Gates W3 verdes.

## Não-objetivos

- **Use case `supersedeDocument`** — futuro `CTR-USECASE-SUPERSEDE-DOCUMENT`.
- **Schema migration / document.mapper / state validator** — adiados (sem use case ainda).
- **`Document.supersede` aceitando `LogicallyDeleted`** — fora de escopo. Document deletado não pode ser substituído (decisão de domínio).
- **Validar que `supersededByDocumentId` existe no repo** — responsabilidade do use case (não do domain puro).
