# W3 — Gate de Qualidade (WORKER-SUPPLIER-PROJECTION)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

| Comando | Resultado |
| :--- | :--- |
| `typecheck` | ✅ |
| `format:check` | ✅ |
| `lint` | ✅ |
| `test` | ✅ **2649 pass** / 0 fail / 18 skip |
| `test:integration:financial` | ✅ **20 pass** — inclui e2e `par_outbox → fin_supplier_view` (SupplierRegistered projetado no read-model, contra MySQL real) |

A topologia da US2 está validada ponta a ponta. Consumer pronto: cadastrar/editar fornecedor no
`partners` → evento no `par_outbox` → worker projeta no `fin_supplier_view` (consistência eventual).
Nenhum gate em vermelho.
