# 000 — Request CTR-OUTBOX-PORTS-AND-MAPPERS

> **Ticket #2/7 da série Outbox MySQL.** Define `OutboxPort` + `EventDelivery` + mappers `event ↔ row` + adapters InMemory + suite contratual.
> Depende de `CTR-OUTBOX-SCHEMA` ✅ (ticket #1).
> **NÃO refatora repositórios** (ticket #4); NÃO implementa worker (ticket #5); NÃO implementa adapter Drizzle (ticket #3).
> 19º ticket Opção B.

## Decisões aplicáveis (do plano)

- **D2** ✅ `repo.save(aggregate, events)` — `OutboxPort` é consumido **pelo repo dentro da transação**, não pelo use case. Port vive em `application/ports/` por consistência (mesmo lugar que `event-bus.ts`), mas é internal-use (apenas adapters do persistence layer chamam).
- **D3** ✅ EN no wire: `event_type='ContractStateUpdated'` (já decidido).
- **D5** ✅ `EventDelivery` com `LoggerEventDelivery` default (stdout + arquivo).

## Estado-alvo

### 1. Port `OutboxPort` em `application/ports/outbox.ts`

```ts
import type { Result } from '../../../../shared/result.ts';
import type { ContractsModuleEvent } from './event-bus.ts';

export type OutboxAppendError =
  | OutboxAppendUnavailable          // tagged
  | OutboxAppendSerializationFailed
  | OutboxAppendDuplicateEventId;

export type OutboxAppendUnavailable = Readonly<{ tag: 'OutboxAppendUnavailable' }>;
export type OutboxAppendSerializationFailed = Readonly<{
  tag: 'OutboxAppendSerializationFailed';
  eventType: string;
  reason: string;
}>;
export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;

export type OutboxPort = Readonly<{
  append: (events: readonly ContractsModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
```

> **Nota:** assinatura sem `tx` deliberadamente — D2 dita que o repo (consumidor) sabe internamente como abrir e passar tx. A versão Drizzle (ticket #3) terá assinatura interna `appendInTx(tx, events)` mas o **port público** mantém a assinatura simples para o InMemory funcionar igual.

### 2. Port `EventDelivery` em `application/ports/event-delivery.ts`

```ts
import type { Result } from '../../../../shared/result.ts';
import type { ContractsModuleEvent } from './event-bus.ts';

export type DeliveryError =
  | DeliveryUnavailable
  | DeliveryRejectedByConsumer;

export type DeliveryUnavailable = Readonly<{ tag: 'DeliveryUnavailable'; cause: string }>;
export type DeliveryRejectedByConsumer = Readonly<{
  tag: 'DeliveryRejectedByConsumer';
  consumerId: string;
  reason: string;
}>;

export type ProcessedEvent = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  event: ContractsModuleEvent;
}>;

export type EventDelivery = Readonly<{
  consumerId: string;
  deliver: (event: ProcessedEvent) => Promise<Result<void, DeliveryError>>;
}>;
```

### 3. Mappers `event ↔ OutboxRow` em `adapters/persistence/mappers/outbox.mapper.ts`

```ts
import { type Result, ok, err } from '../../../../../shared/result.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { ctrOutbox } from '../schemas/mysql.ts';

export type OutboxRow = typeof ctrOutbox.$inferSelect;
export type OutboxInsert = typeof ctrOutbox.$inferInsert;

// SCHEMA_VERSION canônico (D3 — wire format).
export const OUTBOX_SCHEMA_VERSION = 1;

// Tagged errors (Padrão D)
export type OutboxMapperInvalidPayload = Readonly<{
  tag: 'OutboxMapperInvalidPayload'; reason: string;
}>;
export type OutboxMapperUnknownEventType = Readonly<{
  tag: 'OutboxMapperUnknownEventType'; eventType: string;
}>;
export type OutboxMapperSchemaVersionMismatch = Readonly<{
  tag: 'OutboxMapperSchemaVersionMismatch'; expected: number; actual: number;
}>;

export type OutboxMapperError =
  | OutboxMapperInvalidPayload
  | OutboxMapperUnknownEventType
  | OutboxMapperSchemaVersionMismatch;

// ────────────────────────────────────────────────────────────────────────────
// Forward: DomainEvent → OutboxInsert
// ────────────────────────────────────────────────────────────────────────────

export const eventToOutboxInsert = (
  event: ContractsModuleEvent,
  now: Date,
): OutboxInsert => {
  const aggregateInfo = extractAggregateInfo(event); // ver §3.1
  const payload = serializeEvent(event);              // ver §3.2 (Money→cents, Date→ISO, Period→3 fields)
  return {
    eventId: randomUUID(),                            // server-side UUID v4
    aggregateId: aggregateInfo.id,
    aggregateType: aggregateInfo.type,
    eventType: event.type,
    schemaVersion: OUTBOX_SCHEMA_VERSION,
    occurredAt: event.occurredAt,
    enqueuedAt: now,
    processedAt: null,
    attempts: 0,
    payload: JSON.stringify(payload),
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Backward: OutboxRow → ContractsModuleEvent (reidratação)
// ────────────────────────────────────────────────────────────────────────────

export const outboxRowToEvent = (
  row: OutboxRow,
): Result<ContractsModuleEvent, OutboxMapperError> => {
  if (row.schemaVersion !== OUTBOX_SCHEMA_VERSION) {
    return err(outboxMapperSchemaVersionMismatch(OUTBOX_SCHEMA_VERSION, row.schemaVersion));
  }
  const payload = parseJSON(row.payload);             // returns Result
  if (!payload.ok) return err(outboxMapperInvalidPayload(payload.error));
  return deserializeEvent(row.eventType, payload.value, row.occurredAt);
};
```

#### 3.1 — `extractAggregateInfo(event)`

```ts
const extractAggregateInfo = (event: ContractsModuleEvent): { id: string; type: 'Contract' | 'Amendment' } => {
  switch (event.type) {
    case 'ContractCreated':
    case 'ContractStateUpdated':
    case 'ContractEnded':
      return { id: event.contractId as unknown as string, type: 'Contract' };
    case 'AmendmentCreated':
      return { id: event.amendmentId as unknown as string, type: 'Amendment' };
    case 'AmendmentDocumentAttached':
    case 'AmendmentHomologated':
      return { id: event.amendmentId as unknown as string, type: 'Amendment' };
  }
};
```

#### 3.2 — Serialização de payload por event_type

Cada evento tem campos VOs que precisam ser flatten para JSON:
- `Money` → `{ cents: number }`.
- `Period.Fixed` → `{ kind: 'Fixed', start: ISO, end: ISO }`; `Period.Indefinite` → `{ kind: 'Indefinite', start: ISO }`.
- `Date` → ISO 8601 string.
- `UUID-branded types` (ContractId, AmendmentId, DocumentId, UserRef) → string raw.

Reidratação inversa via smart constructors do domain — qualquer falha vira `OutboxMapperInvalidPayload`.

### 4. Adapter InMemory — `adapters/outbox.in-memory.ts`

```ts
export const InMemoryOutbox = (): {
  port: OutboxPort;
  // helpers de teste
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  markProcessed: (eventId: string) => void;
} => { ... };
```

### 5. Adapter InMemory de EventDelivery + LoggerEventDelivery

```ts
// adapters/event-delivery.in-memory.ts (para tests)
export const InMemoryEventDelivery = (consumerId: string): EventDelivery & {
  deliveredEvents: () => readonly ProcessedEvent[];
};

// adapters/event-delivery.logger.ts (default para worker MVP)
export const LoggerEventDelivery = (consumerId: string, logPath?: string): EventDelivery;
```

`LoggerEventDelivery` escreve JSONL em stdout (+ opcional arquivo). Sempre retorna `ok`. Servirá como default antes de módulos consumidores existirem (D5).

### 6. Suite contratual

```
tests/modules/contracts/application/ports/outbox.contract.ts             # parametrizada
tests/modules/contracts/application/ports/event-delivery.contract.ts     # parametrizada
tests/modules/contracts/adapters/persistence/mappers/outbox.mapper.test.ts  # round-trip
tests/modules/contracts/adapters/outbox.in-memory.test.ts                # consome suite
tests/modules/contracts/adapters/event-delivery.in-memory.test.ts        # consome suite
tests/modules/contracts/adapters/event-delivery.logger.test.ts           # smoke (stdout capture)
```

Suite contratual valida (para qualquer adapter):
- `append(events)` registra todos os eventos.
- `append([])` é no-op (ok).
- `append` duplicate eventId → `err(OutboxAppendDuplicateEventId)`.
- Cada evento aparece com `processedAt: null` inicial.
- Round-trip `event → row → event` preserva semântica (Money cents, Period, UUIDs).
- Schema version mismatch detectado.

## Critérios de aceitação

- **CA1** — `OutboxPort` + 3 tagged errors em `application/ports/outbox.ts`.
- **CA2** — `EventDelivery` + 2 tagged errors em `application/ports/event-delivery.ts`.
- **CA3** — `OutboxMapper` com 3 tagged errors + `eventToOutboxInsert` + `outboxRowToEvent` em `adapters/persistence/mappers/outbox.mapper.ts`.
- **CA4** — `InMemoryOutbox` adapter funcional.
- **CA5** — `InMemoryEventDelivery` + `LoggerEventDelivery` adapters.
- **CA6** — Suite contratual para `OutboxPort` (round-trip + duplicate + empty).
- **CA7** — Mapper round-trip preserva os 6 events declarados (ContractCreated, ContractStateUpdated, ContractEnded, AmendmentCreated, AmendmentDocumentAttached, AmendmentHomologated).
- **CA8** — Gates verdes: typecheck/test/test:integration (sem mudança em integration — só unit)/lint.
- **CA9** — `OUTBOX_SCHEMA_VERSION = 1` exportado.

## Não-objetivos

- Adapter Drizzle do OutboxPort → ticket #3.
- Refactor de `repo.save(agg, events)` → ticket #4.
- Worker polling → ticket #5.
- CLI subcommand → ticket #6.
- `public-api/events.ts` → ticket #7.

## Riscos

1. **Serialização de `Money`/`Period`/`Date`** precisa estar simétrica com smart constructors do domínio. Round-trip test detecta drift.
2. **Identificação de aggregate_id por event_type** via switch exaustivo — `noFallthroughCasesInSwitch` + exhaustive nunca falha em compile.
3. **`randomUUID()` server-side** — usar `node:crypto`. Verificar determinismo em tests (talvez aceitar `idGenerator` injetável).
4. **6 event types × payload schema** — bastante código. Considerar helper `serializePayloadByType(event)` separado em arquivo dedicado se ultrapassar 200 LOC.
