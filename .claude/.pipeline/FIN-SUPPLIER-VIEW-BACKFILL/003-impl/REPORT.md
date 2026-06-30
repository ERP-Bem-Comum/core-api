# W1 — Implementação (FIN-SUPPLIER-VIEW-BACKFILL)

**Resultado:** 🟢 GREEN — disciplina `nodejs-process-runner` + `ports-and-adapters`.

## Criado

- `src/jobs/financial/supplier-view-backfill/backfill.ts` — `backfillSupplierViews(records, store, occurredAt)`:
  lógica pura; upsert de cada fornecedor com `occurredAt` antigo (eventos reais vencem o guard); conta `applied`/`failed`.
- `src/modules/partners/public-api/supplier-projection.ts` — `listSuppliersForProjection(connectionString)`:
  read-only; abre pool, `createDrizzleSupplierStore.list`, mapeia `{ supplierRef, name, document }`, fecha.
  Exposto na public-api do partners (consumidor não importa adapters — ADR-0006).
- `src/jobs/financial/supplier-view-backfill/run.ts` — job one-shot (ADR-0041): lista do partners →
  `backfillSupplierViews` no store do financial; exit code (`EX_CONFIG`=78; 1 se houve falhas).
- `package.json` — script `job:financial:supplier-view-backfill`.

## Decisão

`occurredAt` do backfill = `2000-01-01` (antigo) → o guard de recência do store garante que um snapshot
vindo de **evento real** (mais novo) nunca seja sobrescrito pelo backfill. Re-execução idempotente.

## Execução

```
pnpm run typecheck / lint → verde
backfill.test.ts → 3/3 (popula / idempotente / não regride evento real)
```
