# W0 — Testes RED · FIN-OUTBOX-ATOMIC (#127) — em progresso (fundação RED)

**Wave**: W0 · **Status**: in-progress (fundação RED autorada; fatias A/B + integração pendentes) · **Data**: 2026-06-22

## RED autorado (fundação)

`tests/modules/financial/adapters/persistence/fin-outbox-helpers.test.ts` (NOVO) — helper `appendFinOutboxInTx`:
```
tests 1 · pass 0 · fail 1 (RED) — ERR_MODULE_NOT_FOUND (fin-outbox-helpers.ts não existe)
```
Casos (viram GREEN no W1): mapeia evento → linha (`eventType`/`aggregateType`/`payload` serializado/`processedAt=null`) e chama `tx.insert(finOutbox).values(...)`; `events=[]` → no-op.

## Restante do W0 (planejado — ver tasks.md T003, T007–T008, T014–T015)

- **Fundação**: `fin-outbox-schema.drizzle-mysql.test.ts` (integração/Docker) — tabela `fin_outbox` existe (PK/CHECK/índice); INSERT duplicado de `event_id` → erro de PK.
- **Fatia A (documento)**: `document-outbox-atomic.in-memory.test.ts` (outbox que falha → save reverte) + `.drizzle-mysql.test.ts` (integração: falha no outbox → `COUNT==baseline`).
- **Fatia B (conciliação)**: `reconciliation-outbox-atomic.in-memory.test.ts` + `.drizzle-mysql.test.ts` (idem para confirm/undo).

## Recon consolidado (para W1)

- Mapper modelo: `contracts/.../mappers/outbox.mapper.ts` `eventToOutboxInsert(event, now, idGenerator)` → `{eventId, aggregateId, aggregateType, eventType, schemaVersion, occurredAt, enqueuedAt, processedAt:null, attempts:0, payload: JSON.stringify(...)}`.
- `FinancialAppendableEvent` = DocumentEvent | BankStatementEvent | ReconciliationEvent | ReconciliationPeriodClosed (`application/ports/outbox.ts`).
- Eventos da conciliação: `PayableReconciled`/`ReconciliationUndone`/`ManualEntryRecorded` (`domain/reconciliation/events.ts`). Têm `type` + `occurredAt`.
- Tx existentes: `document-repository.drizzle.ts:224` (save); `reconciliation-repository.drizzle.ts:51` (confirm/confirmManualEntry/undo).
- Modelo da tabela: `ctrOutbox` em `contracts/.../schemas/mysql.ts:315`.

## Checkpoint

Sessão longa; #127 é **L**. Fundação RED fixada (design-driving). Retomar: completar os RED restantes (Docker no ar) → W1 (migration `fin_outbox` + helper + 2 repos + 10 use-cases) → W2 → W3. `pnpm run test:integration:financial` exige Docker.
