# W0 — Testes RED (FIN-SUPPLIER-VIEW-LIST-DTO)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Testes adicionados

- `document-summary-supplier-dto.test.ts` — `listItemToSummaryDto` mapeia `supplierName`/`supplierDocument`
  (preenchidos e null).
- `document-supplier-view-enrich.test.ts` — `findPaged` (in-memory) resolve fornecedor pelo read-model
  (`createInMemoryDocumentRepository(timelineStore?, supplierViewStore?)`): preenchido quando o
  `supplierRef` está no read-model; null quando ausente.

## RED

```
node --test ...dto.test.ts ...enrich.test.ts → 4 fail / 0 pass
```

Falta (W1): `DocumentListItem` += `supplierName`/`supplierDocument`; in-memory enrich via store injetado;
drizzle `findPaged` LEFT JOIN `fin_supplier_view`; `dto.ts` + `schemas.ts` (+ campos nullable);
composition injeta o store no in-memory doc repo (memory driver). Integração drizzle do JOIN no W3.
