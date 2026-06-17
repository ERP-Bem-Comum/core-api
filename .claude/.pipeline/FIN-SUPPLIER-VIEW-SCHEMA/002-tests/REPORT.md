# W0 — Testes RED (FIN-SUPPLIER-VIEW-SCHEMA)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Testes adicionados

- `tests/modules/financial/adapters/persistence/supplier-view-store.suite.ts` — suíte de **contrato**
  do `SupplierViewStore` (qualquer adapter consome): `get`→null quando ausente; `upsert` cria + `get`
  retorna; `upsert` mais novo (occurredAt) atualiza; `upsert` mais antigo **não** regride (guard de
  recência); `upsert` 2× idempotente.
- `tests/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.test.ts` — consome
  a suíte com `createInMemorySupplierViewStore`.

## RED verificado

```
node --test ...supplier-view-store.in-memory.test.ts
→ ERR_MODULE_NOT_FOUND: supplier-view-store.in-memory.ts (1 fail / 0 pass)
```

Faltam (W1): `domain/supplier-view/types.ts` (`SupplierView`), `application/ports/supplier-view-store.ts`
(port + erro), adapter in-memory (guard `occurredAt`), schema `fin_supplier_view` + migration, adapter
Drizzle (ON DUPLICATE KEY UPDATE com guard). O teste de integração MySQL (consumindo a mesma suíte)
nasce no W1 junto com o adapter Drizzle e roda no W3 (`test:integration:financial`).
