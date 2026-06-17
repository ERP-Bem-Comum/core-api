# W0 — Testes RED (FIN-SUPPLIER-VIEW-BACKFILL)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Teste adicionado

`tests/jobs/financial/supplier-view-backfill.test.ts` — `backfillSupplierViews(records, store, occurredAt)`:
- popula o read-model a partir dos fornecedores existentes;
- re-execução idempotente;
- **não regride** um evento real mais novo (guard de `occurredAt` antigo do backfill).

## RED

```
node --test ...supplier-view-backfill.test.ts → ERR_MODULE_NOT_FOUND (1 fail / 0 pass)
```

Falta (W1): `src/jobs/financial/supplier-view-backfill/backfill.ts` (lógica pura) + `run.ts` (job
one-shot, ADR-0041) + `listSuppliersForProjection` na public-api do `partners` (lista
`{supplierRef,name,document}` dos fornecedores existentes) + script `job:financial:supplier-view-backfill`.
