# W1 — Implementação (GREEN) · PAR-CONTRACT-COUNT-READMODEL (US6b)

**Outcome:** GREEN. CA1–CA4 (projeção) verde; integração Docker valida o store contra MySQL real.

## Entregue (consumidor `partners`, ADR-0046/0022 — molde feature 014)

| # | Arquivo | Mudança |
|---|---------|---------|
| Ports/UC | `application/ports/contract-count-store.ts`, `application/use-cases/apply-contract-count-event.ts` (+ export no `public-api/index.ts`) | `ContractCountStore` (`applyDelta` idempotente por eventId + `getCount`); `applyContractCountEvent` decodifica via `contracts/public-api` `decodeContractContractorRefV1` (US6a — não lê `ctr_*`), aplica `+1`/`−1`, no-op sem contraparte. |
| Adapters | `repos/contract-count-store.{in-memory,drizzle}.ts` | InMemory (Set de eventIds) + Drizzle (**SELECT-then-INSERT** na tx p/ dedup determinístico — o `affectedRows` do ODKU no-op se mostrou não-confiável; count via `count = count + ?` ODKU). |
| Schema | `schemas/mysql.ts` + migration **`0015`** | `par_contract_count_view` (contractor_ref PK, count) + `par_contract_count_processed` (event_id PK). `db:generate:partners` isolado; COLLATE/ENGINE manual. |
| Worker | `src/workers/contract-count-projection/{run,delivery}.ts` + script `worker:contract-count-projection` | Lê `ctr_outbox` (pool contracts) → `applyContractCountEvent` no `par_contract_count_view` (pool partners). Composition root (ADR-0006/0041). |

## CAs / Gates
- CA1–CA4 (in-memory projection) verde.
- **Integração Docker:** `DrizzleContractCountStore` 4/4 (+1, idempotência por eventId, −1, desconhecido→0); migration `0015` aplica; **46/46 no `test:integration:partners`, sem regressão**.
- Offline: typecheck/format/lint verdes; `pnpm test` **2722 pass, 0 fail**.

## Idempotência (Vernon p.412)
A contagem é **delta** (não snapshot) → não idempotente sob recency. Dedup por **eventId** (`par_contract_count_processed`): SELECT-then-INSERT na mesma tx; o worker é sequencial (`FOR UPDATE SKIP LOCKED` no runLoop) → sem corrida.

## Escopo deferido (issue rastreada)
A **exibição da contagem no grid** (consumidor visual) é fatia separável — o read-model está pronto e consumível via `getCount`. Registrada como GitHub Issue (`partners:grids:contract-count-display`, ADR-0040). Os CAs do W0 (projeção) estão completos.

## Pendente
W2 (code-review) → W3 (gate) → close. **Fecha a feature 015** (último ticket; grid-display rastreado em issue).
