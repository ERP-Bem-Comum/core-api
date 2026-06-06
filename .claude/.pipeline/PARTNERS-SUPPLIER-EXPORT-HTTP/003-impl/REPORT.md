# W1 — Impl · PARTNERS-SUPPLIER-EXPORT-HTTP (🟡 GREEN funcional)
- supplier-schemas.ts: + supplierExportQuerySchema (filtros sem paginação).
- supplier-list-query.ts: queryToFilter flexibilizado (Pick) + suppliersForExport (filtra/ordena → Supplier[]).
- supplier-plugin.ts: GET /suppliers/export (consome suppliersToCsv pronto); text/csv + attachment + nosniff.
Testes: 4 pass / 0 fail.
