# W2 REVIEW — CTR-OUTBOX-PORTS-AND-MAPPERS

Veredito: **APPROVED**
Data: 2026-05-21
Round: 1/3

---

## Escopo da revisão

6 arquivos de produção criados em W1:

| Arquivo | Camada |
|---|---|
| `src/modules/contracts/application/ports/outbox.ts` | Port (application) |
| `src/modules/contracts/application/ports/event-delivery.ts` | Port (application) |
| `src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts` | Mapper (adapter) |
| `src/modules/contracts/adapters/outbox.in-memory.ts` | Adapter InMemory |
| `src/modules/contracts/adapters/event-delivery.in-memory.ts` | Adapter InMemory |
| `src/modules/contracts/adapters/event-delivery.logger.ts` | Adapter Logger |

---

## Checklist por eixo

### A. Padrão D — module-as-namespace + free functions

- `outbox.ts`: tipos + construtores nomeados (`outboxAppendUnavailable`, `outboxAppendSerializationFailed`, `outboxAppendDuplicateEventId`). Sem classe, sem namespace TS explícito — arquivo age como módulo-namespace via import. CONFORME.
- `event-delivery.ts`: mesmo padrão — `deliveryUnavailable`, `deliveryRejectedByConsumer`. CONFORME.
- `outbox.mapper.ts`: construtores de erro + funções `eventToOutboxInsert`/`outboxRowToEvent` exportadas como free functions. CONFORME.
- `outbox.in-memory.ts`: factory function `InMemoryOutbox(): { port, all, pending, markProcessed }`. CONFORME.
- `event-delivery.in-memory.ts`: factory function `InMemoryEventDelivery(consumerId)`. CONFORME.
- `event-delivery.logger.ts`: factory function `LoggerEventDelivery(consumerId, logPath?)`. CONFORME.

### B. Tagged errors (Padrão D §3.B/§3.D)

- `OutboxPort` — 3 tags: `OutboxAppendUnavailable`, `OutboxAppendSerializationFailed`, `OutboxAppendDuplicateEventId`. Cada uma com payload semântico (eventType+reason, eventId). CONFORME.
- `EventDelivery` — 2 tags: `DeliveryUnavailable` (cause), `DeliveryRejectedByConsumer` (consumerId+reason). CONFORME.
- `OutboxMapper` — 3 tags: `OutboxMapperInvalidPayload` (reason), `OutboxMapperUnknownEventType` (eventType), `OutboxMapperSchemaVersionMismatch` (expected+actual). CONFORME.
- Construtores de erro exportados e usados coerentemente no corpo das funções. CONFORME.

### C. Round-trip semântico dos 6 event types

| Evento | Money cents preserva | Period 3-fields preserva | Date ISO preserva | UUIDs raw string |
|---|:---:|:---:|:---:|:---:|
| ContractCreated | N/A | N/A | sim (`occurredAt`) | sim (`contractId`) |
| ContractStateUpdated | sim (`newCurrentValue.cents`) | sim (Fixed: `kind/start/end`; Indefinite: `kind/start`) | sim | sim (`contractId`, `amendmentId`) |
| ContractEnded | N/A | N/A | sim | sim (`contractId`) |
| AmendmentCreated | N/A | N/A | sim | sim (`amendmentId`, `contractId`) |
| AmendmentDocumentAttached | N/A | N/A | sim | sim (`amendmentId`, `signedDocumentRef` via `DocumentId.rehydrate`) |
| AmendmentHomologated | N/A | N/A | sim | sim (`amendmentId`, `homologatedBy` via `UserRef.rehydrate`) |

Verificação: `serializePeriod` usa `p.kind` como discriminador e `toISOString()` em `start`/`end`; `deserializePeriod` reconstrói via `Period.create`/`Period.createIndefinite` — round-trip simétrico. CONFORME.

### D. Zero `throw`/`class`/`this`/`any` no domínio

Domínio não foi tocado. Nos 6 arquivos novos:
- Nenhum `throw` encontrado (grep confirmado).
- Nenhum `class` encontrado.
- Nenhum `this` encontrado.
- Nenhum `any` encontrado. Todos os casts usam `as unknown as string` com comentário, ou `unknown` com narrowing.

CONFORME.

### E. Switch exaustivo sem `default: throw`

`extractAggregateInfo` (mapper:118–130): cobre os 6 variants sem `default`. Comentário interno explica que a omissão do `default` força o compilador a detectar novos tipos. `noFallthroughCasesInSwitch: true` no tsconfig confirma cobertura em compile time. CONFORME.

`serializeEvent` (mapper:145–190): mesmos 6 variants, sem `default`. CONFORME.

`deserializeEvent` (mapper:284–421): usa `default: return err(outboxMapperUnknownEventType(eventType))` pois o discriminador é `string` em runtime (não discriminated union tipada) — correto e esperado. CONFORME.

`serializePeriod` (mapper:136–143): 2 variants (`Fixed`, `Indefinite`), sem `default`. CONFORME.

### F. `OUTBOX_SCHEMA_VERSION = 1` exportado

`outbox.mapper.ts:21`: `export const OUTBOX_SCHEMA_VERSION = 1;`. CA9 cumprido. CONFORME.

### G. `LoggerEventDelivery` JSONL

`event-delivery.logger.ts`: linha JSONL contém `{ eventId, eventType, schemaVersion, deliveredAt (ISO), payload }`. Escrita em stdout via `process.stdout.write` + append opcional em arquivo. Erros de I/O silenciados intencionalmente (comentário documentado). Sempre retorna `ok(undefined)`. CONFORME.

### H. Import conventions

- Todos os imports relativos com extensão `.ts`. CONFORME.
- Imports de tipo com `import type { ... }` ou `import { type ... }`. CONFORME.
- `import type { ctrOutbox } from '../schemas/mysql.ts'` — linha 5 do mapper usa `import type`. CONFORME.

### I. Tratamento de `OutboxInsert as OutboxRow` no InMemoryOutbox

`outbox.in-memory.ts:49`: `rows.push(insert as OutboxRow)` — cast necessário porque `OutboxInsert` tem campos opcionais vs `OutboxRow` obrigatórios. O cast é seguro pois `eventToOutboxInsert` sempre preenche `processedAt: null` e `attempts: 0`. Comentário documenta a invariante. CONFORME (com nota).

### J. `markProcessed` mutation

`outbox.in-memory.ts:63`: mutação via `(row as { processedAt: Date | null }).processedAt = new Date()`. Ponto de mutação controlada, apenas em helper de teste, devidamente comentado. CONFORME.

---

## Issues encontradas

Nenhuma issue bloqueante ou não-bloqueante.

Observação de estilo (não-bloqueante, sem ação requerida):

- `outbox.mapper.ts:260` — `err(\`period-unknown-kind: ${obj['kind'] as string}\`)` usa `as string`. Tecnicamente seguro após o `typeof obj['kind'] !== 'string'` que retornou falso nos branches anteriores, mas a lógica de fall-through com cast poderia ser substituída por `String(obj['kind'])` para evitar o cast explícito. Preferência de estilo; lint passa. Não requer fix.

---

## Conclusão

Todos os 9 CAs verificados no código. Nenhuma violação das regras invariantes do CLAUDE.md. Código está pronto para W3.

**APPROVED — Round 1.**
