# W3 — Gate de Qualidade (FIN-SUPPLIER-VIEW-LIST-DTO)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

| Comando | Resultado |
| :--- | :--- |
| `typecheck` | ✅ |
| `format:check` | ✅ |
| `lint` | ✅ |
| `test` | ✅ **2654 pass** / 0 fail / 18 skip |
| `test:integration:financial` | ✅ **21 pass** — inclui LEFT JOIN `fin_documents × fin_supplier_view` (preenchido + null) contra MySQL real |

Backward-compat preservada (FR-008/009): só adição de `supplierName`/`supplierDocument`; HTTP/suíte
existentes verdes. **US2 do #47 funcionalmente completa**: o grid resolve fornecedor pelo read-model
local, sem chamada cross-módulo. Nenhum gate em vermelho.
