# W1 — Implementação (FIN-SUPPLIER-VIEW-APPLY)

**Resultado:** 🟢 GREEN — disciplina `ports-and-adapters`.

## Criado

- `application/use-cases/apply-supplier-event.ts` — `applySupplierEvent({ store })({ eventType, payload })`:
  - filtra `SupplierRegistered`/`SupplierEdited` (demais → `ok`, skip);
  - `safeJsonParse` + valida shape `{ supplierRef, name, document, occurredAt }` (ADR-0043) → `SupplierView`;
  - `store.upsert` (o guard de recência por `occurredAt` vive no store — sem regra pura redundante);
  - erro `'supplier-event-payload-invalid'` (worker faz retry/DLQ) | `SupplierViewStoreError`.
- `public-api/index.ts` — exporta `applySupplierEvent` + tipos (consumível pelo composition root do worker).

## Execução

```
pnpm run typecheck / lint → verde
apply-supplier-event.test.ts → 6/6 (registra/edita/skip/JSON malformado/shape inválido/idempotência)
```

Sem componente MySQL próprio (application puro sobre o `SupplierViewStore` já validado). Idempotência
e fora-de-ordem garantidas pelo store (testado contra MySQL no ticket anterior).
