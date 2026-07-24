# W3 — gate de qualidade — FIN-OCR-AUTOFILL-SUPPLIER

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm run lint` (arquivos tocados) | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4416 tests · 4396 pass · **0 fail** · 20 skip |

- Use-case `ingestDocument`: CNPJ do emitente casa fornecedor cadastrado → rascunho leva `supplierRef`;
  sem match → sem `supplierRef` (manual); sem resolver (memory) → sem `supplierRef` — 3 casos + CA4 do mapper
  intacto (mapper não seta supplierRef).
- Partners `findSupplierIdByCnpj` (opcional, aditivo). A query real contra `par_suppliers` é #500-gated;
  o wiring é provado com resolver fake.
