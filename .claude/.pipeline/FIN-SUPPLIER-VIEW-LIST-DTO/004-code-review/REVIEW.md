# W2 — Code Review (FIN-SUPPLIER-VIEW-LIST-DTO)

**Veredito:** ✅ APPROVED · **Disciplina:** zod-expert + clean-code (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 0

## Escopo

Grid `GET /api/v2/financial/documents` resolve fornecedor (nome+CNPJ) pelo read-model local.

## Conformidade

- **Contrato HTTP (ADR-0027).** `documentSummarySchema` += `supplierName`/`supplierDocument`
  (`z.string().nullable()`) — coerente com `DocumentListItem` e `listItemToSummaryDto`; o
  `documentListResponseSchema` reusa o summary. Adição apenas (FR-008/009) — campos pré-existentes
  byte-idênticos (validado: `pnpm test` 2653, suíte e HTTP existentes verdes). ✅
- **Sem N+1 / sem cross-módulo em runtime (SC-002).** Drizzle: **um** LEFT JOIN intra-`financial`
  (`fin_documents × fin_supplier_view`), não lookup por linha. In-memory: enrich em lote via store
  injetado. Nenhuma chamada ao `partners` na listagem. ✅
- **`null` sem erro (FR-006).** LEFT JOIN → null quando `supplier_ref` nulo/ausente no read-model;
  in-memory idem. Validado contra MySQL real (caso "unknown" → null). ✅
- **Isolamento (ADR-0014).** JOIN é intra-`financial` (ambas `fin_*`); o read-model é alimentado só
  por eventos (não lê `partners` em runtime). ✅
- **Paridade memory↔drizzle.** `enrichWithSupplierView` espelha o JOIN; a suíte de contrato do
  document repo segue verde nos dois adapters. ✅

## Verificação

```
typecheck / format / lint → verde
dto + enrich → 4/4 · pnpm test → 2653 · test:integration:financial → 21/21 (inclui LEFT JOIN)
```

Sem achados. CNPJ alfanumérico (ADR-0044) flui como texto sem reformatação.
