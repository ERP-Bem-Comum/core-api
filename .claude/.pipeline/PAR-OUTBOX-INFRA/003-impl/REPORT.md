# W1 — Implementação (GREEN) — PAR-OUTBOX-INFRA

## Implementado (infra de outbox genérica do partners, replicando ctr_outbox → par_*)

### Port
- `src/modules/partners/application/ports/outbox.ts` — `OutboxMessage` (genérico), `OutboxPort.append(messages)`, `OutboxRow`, `OutboxBatchOps`, `WorkerOutboxOps`, erros append/query (tagged + constructors).
- `src/modules/partners/application/ports/event-delivery.ts` — `EventDelivery`/`ProcessedEvent` genéricos (payload opaco string).

### Schema + migration
- `schemas/mysql.ts` — `parOutbox` + `parOutboxDeadLetter` (CHECK aggregate_type IN ('Supplier'), attempts>=0, event_type não-vazio; índices (processed_at,occurred_at) e (aggregate_id); DLQ por failed_at). Imports `index`, `smallint` adicionados. `$inferSelect`/`$inferInsert` exportados.
- `migrations/mysql/0009_bumpy_taskmaster.sql` — gerado via `pnpm run db:generate:partners`; hardening manual: `COLLATE utf8mb4_bin` em event_id/aggregate_id + `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` (espelha ctr_outbox).

### Adapters
- `adapters/persistence/repos/outbox-repository.drizzle.ts` — `append` + `appendOutboxInTx(tx, schema, messages)` + worker ops (withPendingBatch FOR UPDATE SKIP LOCKED, markProcessed idempotente, markFailed, moveToDeadLetter). Guard type-level schema↔port.
- `adapters/outbox/outbox.in-memory.ts` — InMemory do OutboxPort + WorkerOutboxOps + helpers de teste.
- `adapters/event-delivery/event-delivery.logger.ts` — LoggerEventDelivery (JSONL).

### Worker
- `worker/outbox-worker.ts` (runOnce/runLoop genéricos), `worker/config.ts` (env PARTNERS_DATABASE_URL), `worker/run.ts` (openPartnersMysql + SIGTERM).
- `package.json` — script `worker:outbox:partners`.

## Gates W1 (verde)
- `pnpm run typecheck` → green (inclui compile do teste de integração).
- InMemory test → 7 pass / 0 fail.
- `pnpm exec eslint` (arquivos novos) → 0 erros.
- `pnpm exec prettier --check` (arquivos novos) → ok.
- `pnpm test` (suíte completa) → 2608 pass / 0 fail / 18 skip (baseline 2600 pass; +8 do novo teste). Integração MySQL gated off (não rodada em W1).

## Desvio vs contracts (documentado)
- IDs em `varchar(36)` (não `char(36)`) — alinhamento com a convenção das demais tabelas `par_*` (todas usam varchar(36) + COLLATE utf8mb4_bin). Hardening COLLATE/ENGINE manual idêntico ao ctr_outbox.
- `append` recebe `OutboxMessage[]` genérico (não `ContractsModuleEvent[]`), conforme a decisão de design do ticket (desacoplar US1 de US2). Sem `eventToOutboxInsert`/`outboxRowToEvent` (event mappers) — o payload é opaco; quem monta é PAR-SUPPLIER-EVENTS.
- Worker entrega `ProcessedEvent` montado direto da row (sem desserialização de evento de domínio nem branch "payload corrompido → DLQ", inexistente para payload opaco).
