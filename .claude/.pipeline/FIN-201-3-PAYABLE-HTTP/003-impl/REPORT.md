# W1 — Implementação · FIN-201-3-PAYABLE-HTTP (#222)

**Outcome:** GREEN · **Data:** 2026-06-23

Borda HTTP `GET /financial/payable-titles` (grid payable-centric).

- Zod `schemas.ts`: `listPayablesQuerySchema` + `payableSummarySchema` (centavos string) + `payableListResponseSchema`.
- `plugin.ts`: rota RBAC `fiscal-document:read`; filtro da query → `deps.listPayables` → `payableListItemToDto`.
- Composição: `FinancialHttpDeps.listPayables` + `Pools.payableListView`; memory = in-memory sobre o STORE
  COMPARTILHADO do document-repo; mysql = `createDrizzlePayableListView(handle)`.
- Refactor aditivo `document-repository.in-memory.ts`: exporta `StoreEntry`/`DocumentStore` + aceita `store`
  como 4º param (default novo Map; back-compat). Permite o PayableListView in-memory derivar os títulos.

Testes HTTP (3). Gate: typecheck/format/lint ✅; `pnpm test` fail 0; `test:integration:financial` fail 0.
