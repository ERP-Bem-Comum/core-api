# W2 — code review (self, read-only) — FIN-OCR-AUTOFILL-SUPPLIER

**Veredito: APPROVED.**

- **Reuso máximo**: o `ingestDocument` já lê o emitente (`SupplierIdentity.taxId`) e já guarda o arquivo. A
  fatia só resolve o `taxId → supplierRef` de um fornecedor CADASTRADO e o pré-preenche no rascunho.
- **Gracioso**: `resolveSupplierByCnpj` é dep **opcional**; sem match, CNPJ inválido ou falha de leitura →
  `supplierRef` não é setado → seleção manual (comportamento atual — CA back-compat provada). Nunca bloqueia
  a ingestão (o PDF + rascunho já foram salvos).
- **Cross-module correto**: partners expõe `findSupplierIdByCnpj` no `ContractorReadPort` (public-api),
  **opcional** (aditivo, precedente do AuthUserReadPort) — não quebra doubles de teste do port. Drizzle
  normaliza via VO `Cnpj` e resolve pelo índice único `par_suppliers_cnpj_idx`; CNPJ inválido → ok(null)
  (não é erro de infra). Financial nunca importa partners direto — o composition injeta o resolver.
- **Driver memory**: `contractorReadPort` é null → resolver ausente → sem resolução (só o driver mysql
  resolve; a query real é #500-gated). O wiring é provado no use-case com resolver fake (3 casos).
- ADR-0006 (só public-api cross-module), ADR-0014 (partners só lê `par_*`), adapters.md (try/catch → Result).

Sem Blocker/Major/Minor. 1 round.
