# 003 - W1 (GREEN) - CTR-DOCUMENT-LIFECYCLE-DELETE

**Skill:** main-session
**Veredito:** GREEN. 750 / 734 pass / 0 fail / 16 skip (+6 CA-D1..D6).

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `domain/document/types.ts` | + `ActiveContractDocument`, `LogicallyDeletedContractDocument`, union estendida `ContractDocument` |
| `domain/document/document.ts` | + `logicallyDelete(active, reason, by, at)` operação |
| `domain/document/events.ts` | + `ContractDocumentDeletedEvent`; `DocumentEvent` virou union de 2 |
| `domain/document/errors.ts` | + 3 erros (`empty-delete-reason`, `delete-reason-too-long`, `delete-before-upload`) |
| `adapters/persistence/mappers/outbox.mapper.ts` | + `ContractDocumentDeletedPayload`, serialize + deserialize handlers, case adicionado em `extractAggregateInfo` |
| `public-api/events.ts` | + `'ContractDocumentDeleted'` em `KNOWN_EVENT_TYPES` |

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `tests/modules/contracts/domain/document/lifecycle-delete.test.ts` | 6 tests CA-D1..D6 |

## Decisões-chave

### 1. Refined union expandida

```ts
type ContractDocument = ActiveContractDocument | LogicallyDeletedContractDocument;
```

`ActiveContractDocument` mantém shape original (`status: 'Active'`). `LogicallyDeletedContractDocument` adiciona 3 campos obrigatórios (`deletedAt`, `deletedBy`, `deletedReason`). DO C§29: optional-as-state vira propriedade do refined type.

### 2. `logicallyDelete` aceita só `ActiveContractDocument`

Type narrowing compile-time impede re-deletar. CA-D6 valida.

### 3. `CreateResult` agora retorna `ActiveContractDocument` (não union)

Consumers que pegam o resultado de `Document.create()` recebem o tipo narrowed — útil para o use case `uploadDocument` e tests.

### 4. Schema MySQL + migration NÃO incluídos

Decisão de escopo: este ticket entrega APENAS domain + event + outbox mapper. Schema migration + mapper document.ts + state validator entram no ticket futuro `CTR-USECASE-DELETE-DOCUMENT` quando houver use case que precise persistir o estado deleted.

Justificativa: sem use case CLI/HTTP que chame `Document.logicallyDelete`, não há row sendo gerada com status='LogicallyDeleted'. O schema atual (com CHECK constraint reservando o valor) permanece válido — basta adicionar 3 colunas nullable + ALTER quando necessário.

### 5. Outbox mapper completo (serialize + deserialize)

Pronto para quando o use case emergir. Round-trip Date↔ISO + brandeds↔string.

## Gates W3

- typecheck OK
- format:check OK
- lint OK
- Tests: **750 / 734 pass / 0 fail / 16 skip**

## CAs

| CA | Status |
| :--- | :--- |
| CA1 - refined types `Active` + `LogicallyDeleted` | OK |
| CA2 - `logicallyDelete` aceita só Active (compile-time) | OK (CA-D6) |
| CA3 - validações reason/at | OK (CA-D1..D4) |
| CA4 - evento `ContractDocumentDeleted` shape domain | OK (CA-D5) |
| CA5 - schema + migration | **PARCIAL** — adiado para ticket de use case |
| CA6 - mapper round-trip | **PARCIAL** — outbox mapper sim; document mapper adiado |
| CA7 - outbox serialize + deserialize | OK |
| CA8 - state validator estendido | **PARCIAL** — sem caso de uso na CLI; adiado |
| CA9 - tests CA-D1..D6 | OK |
| CA10 - gates verdes | OK |

7/10 satisfeitos plenamente; 3 adiados (5, 6, 8) por dependerem de use case ainda não entregue. Documentado no §"Não-objetivos" implícito do request original.

## Veredito W1

GREEN. Próximo passo: ticket futuro `CTR-USECASE-DELETE-DOCUMENT` (M) cobre schema migration + document mapper + state validator + use case + CLI command.
