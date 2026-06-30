# W0 — Testes RED (FIN-SUPPLIER-VIEW-APPLY)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Teste adicionado

`tests/modules/financial/application/use-cases/apply-supplier-event.test.ts` — `applySupplierEvent({ store })`:
- `SupplierRegistered` com payload válido → popula o read-model.
- `SupplierEdited` posterior → atualiza (snapshot novo, via guard do store).
- `eventType` fora do contrato (`SupplierDeactivated`) → `ok`, sem escrita (skip).
- payload JSON malformado → `err('supplier-event-payload-invalid')`.
- payload com shape inválido (faltando `document`) → `err('supplier-event-payload-invalid')`.
- idempotente: aplicar 2× mantém o estado.

## RED

```
node --test ...apply-supplier-event.test.ts → ERR_MODULE_NOT_FOUND (1 fail / 0 pass)
```

Falta (W1): `application/use-cases/apply-supplier-event.ts` (filtro `SupplierRegistered`/`SupplierEdited`
+ parse do payload ADR-0043 → `SupplierView` + `store.upsert`) + export na public-api do financial.
Decisão: o guard de recência permanece no `SupplierViewStore` (já entregue) — sem regra pura separada.
