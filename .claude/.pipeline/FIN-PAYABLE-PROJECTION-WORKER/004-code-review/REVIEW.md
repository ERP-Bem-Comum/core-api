# W2 — REVIEW · FIN-PAYABLE-PROJECTION-WORKER (#307)

**Metodologia:** 2 agentes especialistas read-only, escopos disjuntos.
- **`nodejs-runtime-expert`** — worker runtime (`run.ts`/`delivery.ts` + decisão FIFO).
- **`drizzle-orm-expert`** — persistência (DLQ table + migration 0028 + reader).

## Veredicto final: **APPROVED** (round 2 — achados endereçados)

## `nodejs-runtime-expert` → APPROVED-WITH-NITS

Runtime **correto** — graceful shutdown (SIGTERM/SIGINT → AbortController; `finally` fecha pool + remove listeners), exit codes (78/1/0 via `process.exitCode`, não `process.exit`), top-level await ESM, `runLoop` config idêntico ao supplier, delivery com payload opaco. Mirror fiel do `supplier-view-projection` (1 pool).

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| #1 | Major | sem `installLastResortHandlers` (uncaught/unhandledRejection) → pool abandonado em throw fora da promise-chain. **Sistêmico** — os 4 workers do repo não têm (só `server.ts`). | **Follow-up** (issue cobrindo os 4 workers) — não é regressão do #307. |
| #2 | Major | `updateStatus` faz UPDATE silencioso de 0 linhas se FIFO for violado (transição antes do create) — sem log/retry/DLQ. | **Runbook §3 atualizado** (nomeia o modo de falha silencioso + ordem no reprocesso de DLQ). Log `affectedRows===0` = **follow-up**. |
| nit | Minor | comentário do `process.off` do contracts não copiado. | cosmético — ignorado. |

Decisão FIFO (runbook §3): **sólida** para o mecanismo (claim ordenado garante DocumentSaved antes das transições sob 1 instância; ressalva multi-instância correta; guard de recência não resolveria status-antes-de-create).

## `drizzle-orm-expert` → REJECTED (round 1) → endereçado

Fidelidade algorítmica ao molde contracts **excelente** (findPendingForUpdate/withPendingBatch com FOR UPDATE SKIP LOCKED + ordenação; markProcessed idempotente; moveToDeadLetter transacional + not-found via out-param; cast `FinOutboxRow→OutboxRow` seguro campo-a-campo; boundary try/catch→Result; ADR-0020 OK).

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| — | Major | caminho **DLQ** (`moveToDeadLetter`/`markFailed`) **sem teste** — integração só cobre happy path. | **Corrigido** — teste de integração DLQ (markFailed + moveToDeadLetter + row completa na DLQ + DELETE no outbox + not-found→err), gated `MYSQL_INTEGRATION`. |
| — | Minor | `fin_outbox_dead_letter` sem CHECK de `aggregate_type` (paridade `ctr_outbox_dead_letter`). | **Corrigido** — CHECK adicionado + migration `0028` regenerada. |
| — | Info | CHARSET/COLLATE manual ausente na 0028. | dívida **pré-existente do módulo** (0012+); não este ticket. |
| — | Info | `int` vs `smallint` em schema_version/attempts. | **correto** — consistência com `fin_outbox` (int desde #127). |

## Gate pós-correções (round 2)

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` **3309 pass / 0 fail / 18 skipped**. Delivery 4/4 + m2 GREEN. DLQ + e2e via integração (gated `MYSQL_INTEGRATION` — Docker/CI).

## Follow-ups registrados (ADR-0040 — não corrigir agora)

1. `installLastResortHandlers` nos 4 workers de outbox (`contracts`/`partners`/`supplier-view`/`payable-view`).
2. `PayableViewStore.updateStatus` logar `affectedRows === 0` (observabilidade do modo de falha silencioso).
