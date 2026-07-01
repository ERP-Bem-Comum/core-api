# W1 — GREEN · FIN-PAYABLE-PROJECTION-WORKER (#307)

Disciplinas: **`ts-domain-modeler`** (m2) + **`drizzle-schema-author`**/**`drizzle-orm-expert`** (DLQ+reader) + **`nodejs-runtime-expert`** (worker) + **`ports-and-adapters`** (wiring).

## Mudanças

| Arquivo | Mudança |
| :-- | :-- |
| `schemas/mysql.ts` + migration `0028_natural_ikaris.sql` | tabela `fin_outbox_dead_letter` (mirror `ctr_outbox_dead_letter`; CHECK attempts≥0 + índice failed_at). |
| `repos/fin-outbox-reader.drizzle.ts` (novo) | reader `WorkerOutboxOps` do `fin_outbox` (claim ordenado FOR UPDATE SKIP LOCKED, markProcessed idempotente, markFailed, moveToDeadLetter, withPendingBatch) — mirror contracts. |
| `workers/payable-view-projection/{delivery,run}.ts` (novos) | delivery (consumer `financial-payable-view`, payload opaco → `applyPayableEvent`) + entrypoint (1 pool, signals, runLoop) — mirror supplier. |
| `public-api/index.ts` | expõe `applyPayableEvent` + `PayableViewStore`. |
| `domain/payable-view/types.ts` + `events.ts` + `apply-payable-event.ts` | **m2**: `PayableSnapshot.status: DocumentStatus` + `documentStatusToViewStatus` (switch exaustivo 8→4). |
| `package.json` + `compose.yaml` | script `worker:payable-projection` + serviço `payable-projection` (profile workers, 1 réplica). |
| `handbook/runbooks/payable-view-projection-worker.md` (novo) | runbook completo (fluxo, FIFO+multi-instância, DLQ, config, troubleshooting). |
| `tests/workers/payable-view-projection/{delivery,projection.integration}.test.ts` | delivery (CA1) + e2e gated `MYSQL_INTEGRATION` (CA5). |

## Decisão de ordenação (documentada no runbook §3)

**FIFO por agregado sob consumidor único** — o claim `ORDER BY occurred_at FOR UPDATE SKIP LOCKED`
garante DocumentSaved antes das transições. **Sem** guard de recência/`occurred_at` (redundante sob
FIFO; não resolveria status-antes-de-create). Ressalva multi-instância documentada (particionamento
por agregado OU guard — só ao escalar).

## Verificação

- delivery.test (CA1): **4/4 GREEN**; apply-payable-event (m2 CA4): **7/7 GREEN**.
- `typecheck` + `format:check` + `lint` verdes; suíte anterior **3308 pass / 0 fail**.
- Integração e2e (CA5): escrita, **gated** `MYSQL_INTEGRATION` (Docker down local → valida em CI/VM).
