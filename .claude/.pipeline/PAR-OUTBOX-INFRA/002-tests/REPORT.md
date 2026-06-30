# W0 — Testes RED — PAR-OUTBOX-INFRA

## Objetivo
Infra de outbox genérica no módulo `partners` (`par_*`), replicando o padrão do `contracts` (`ctr_outbox`). `OutboxPort.append` recebe `OutboxMessage[]` já montadas (genérico — quem monta é PAR-SUPPLIER-EVENTS). `aggregate_type` aceita só `'Supplier'` (CHECK).

## Testes escritos (RED)
1. `tests/modules/partners/adapters/outbox/outbox.in-memory.test.ts` — contrato InMemory (append/pending/duplicate/withPendingBatch/markProcessed idempotente/moveToDeadLetter/markFailed).
2. `tests/modules/partners/adapters/persistence/outbox-repository.drizzle-mysql.test.ts` — integração MySQL (gate `MYSQL_INTEGRATION=1`): appendOutboxInTx atômico (rollback→0, commit→1); FOR UPDATE SKIP LOCKED disjunto; CHECK aggregate_type rejeita 'Financier'; moveToDeadLetter atômico.

## Resultado RED (confirmado)
- outbox.in-memory.test.ts → fail 1 (ERR_MODULE_NOT_FOUND: outbox.in-memory.ts)
- outbox-repository.drizzle-mysql.test.ts → fail 1 (ERR_MODULE_NOT_FOUND: outbox-repository.drizzle.ts)

Baseline `pnpm test` antes do W0: 2618 tests, 0 fail, 18 skipped.
