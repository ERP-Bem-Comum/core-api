# W1 — Implementação (FIN-SUPPLIER-VIEW-LIST-DTO)

**Resultado:** 🟢 GREEN — disciplina `drizzle-orm-expert`.

## Mudança

- `domain/document/query.ts` — `DocumentListItem` += `supplierName`/`supplierDocument` (`string | null`).
- `adapters/persistence/repos/document-repository.drizzle.ts` (`findPaged`) — **LEFT JOIN** intra-financial
  `fin_documents × fin_supplier_view` em `supplier_ref`; seleciona/mapeia `supplierName`/`supplierDocument`.
- `adapters/persistence/repos/document-repository.in-memory.ts` — factory ganha `supplierViewStore?`;
  `findPaged` enriquece via `enrichWithSupplierView` (lookup no store; null sem store/match) — espelha o JOIN.
- `adapters/http/dto.ts` + `schemas.ts` — item ganha `supplierName`/`supplierDocument` (`z.string().nullable()`).
- `adapters/http/composition.ts` — memory driver injeta `createInMemorySupplierViewStore()` (vazio sem
  consumer → null); mysql resolve pelo JOIN.

## Execução

```
pnpm run typecheck / format / lint → verde
dto + enrich (in-memory) → 4/4
pnpm test (suíte completa) → 2653 pass / 0 fail (sem regressão; FR-008 campos pré-existentes intactos)
test:integration:financial → 21/21, inclui LEFT JOIN contra MySQL real (preenchido + null)
```

Backward-compat (FR-008/009): adição apenas; paginação flat inalterada.
