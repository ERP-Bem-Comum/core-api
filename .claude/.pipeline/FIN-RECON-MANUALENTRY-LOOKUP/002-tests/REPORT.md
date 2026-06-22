# W0 — Testes RED · FIN-RECON-MANUALENTRY-LOOKUP (#191)

**Outcome:** RED · **Data:** 2026-06-22

**Teste:** `tests/modules/financial/adapters/persistence/reconciliation-mapper.test.ts` (novo, no-Docker).

Round-trip via domínio: `confirmManualEntry` (type `ManualEntry`) → `reconciliationToRow` → `toDomain`.
Asserção CA1: `toDomain(row, [])` retorna `ok` com `type === 'ManualEntry'`.

**RED confirmado:** `back.ok === false` — `toDomain` devolvia `err('invalid-reconciliation-type')` porque
`toType` (`reconciliation.mapper.ts:34-35`) não incluía `'ManualEntry'`. Falha por inexistência do
comportamento correto no rehydrator (a causa-raiz exata do 503 do lookup #175).
