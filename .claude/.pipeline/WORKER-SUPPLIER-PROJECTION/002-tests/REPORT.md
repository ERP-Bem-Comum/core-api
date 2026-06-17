# W0 — Testes RED (WORKER-SUPPLIER-PROJECTION)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Teste adicionado

`tests/workers/supplier-view-projection/delivery.test.ts` — o `EventDelivery` do composition root
(consumer `'financial-supplier-view'`):
- `rowToMessage(OutboxRow)` extrai `{ eventType, payload }` (opaco).
- `deliver(SupplierRegistered)` → aplica no read-model (via `applySupplierEvent`), retorna `ok`.
- `deliver` com payload malformado → `err` (DeliveryError → worker faz retry/DLQ).
- `deliver` eventType fora do contrato → `ok`, sem escrita.

## RED

```
node --test ...delivery.test.ts → ERR_MODULE_NOT_FOUND (1 fail / 0 pass)
```

Falta (W1): `src/workers/supplier-view-projection/delivery.ts` (cola `applySupplierEvent`),
`run.ts` (entrypoint: 2 pools partners+financial, `runLoop` genérico, graceful shutdown),
script `worker:supplier-projection`, export de `SupplierViewStore` na public-api do financial,
e teste de integração e2e (`par_outbox` → `fin_supplier_view`) para o W3.
