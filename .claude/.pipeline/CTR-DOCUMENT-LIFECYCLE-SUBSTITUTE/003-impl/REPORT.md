# 003 - W1 (GREEN) - CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE

**Skill:** main-session
**Veredito:** GREEN. 756 / 740 pass / 0 fail / 16 skip (+6 CA-S1..S6).

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `domain/document/types.ts` | + `SupersededContractDocument`; union expandido para 3 variantes |
| `domain/document/document.ts` | + `supersede(active, byDocId, by, at)` operação |
| `domain/document/events.ts` | + `ContractDocumentSupersededEvent`; `DocumentEvent` union de 3 |
| `domain/document/errors.ts` | + 2 erros (`supersede-self`, `supersede-before-upload`) |
| `adapters/persistence/mappers/outbox.mapper.ts` | + payload + extractAggregate case + serialize + deserialize completos |
| `public-api/events.ts` | + `'ContractDocumentSuperseded'` em `KNOWN_EVENT_TYPES` |

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `tests/modules/contracts/domain/document/lifecycle-supersede.test.ts` | 6 tests CA-S1..S6 |

## Decisões-chave

### 1. Union de 3 variantes

```ts
type ContractDocument =
  | ActiveContractDocument
  | LogicallyDeletedContractDocument
  | SupersededContractDocument;
```

Compilador agora exige switch exhaustive sobre 3 variantes.

### 2. `supersede` aceita SOMENTE Active

Compile-time exhaustiveness impede re-substituir (Deleted ou Superseded). CA-S5/S6 validam.

### 3. Persistência adiada (igual DELETE)

Schema migration + document.mapper extension + state validator ficam para `CTR-USECASE-SUPERSEDE-DOCUMENT` (futuro). Mesma justificativa: sem use case, código morto.

## CAs

8/8 satisfeitos plenamente. CAs de persistência adiados (consistente com DELETE).

## Gates W3

- typecheck/format/lint OK
- Tests: **756 / 740 / 0 / 16**

## Veredito W1

GREEN. Domain do lifecycle entregue completamente (delete + substitute).
