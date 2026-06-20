# W1 — Implementação (GREEN) · FIN-INHERITED-CATEGORIZATION (#48 CA2)

**Data**: 2026-06-20

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Application | `use-cases/save-document.ts` | `SaveDocumentDeps + contractCategorizationReader: ContractCategorizationReadPort` (importado da public-api de contracts, ADR-0006). Após rehydrate dos refs: se `contractRef` setado e `programRef`/`budgetPlanRef` ausentes, consulta `getCategorization(contractRef)` e herda `programId`/`budgetPlanId` (pré-fill — a ref do front prevalece). Erro de leitura → `err`. |
| Composição | `adapters/http/composition.ts` | Wira o reader por driver: **memory** = `createInMemoryContractCategorizationReadStore()` (vazio); **mysql** = `buildContractsReadPort({connectionString})` na MESMA conexão (ctr_* no mesmo DB do monólito) + close no shutdown. |

GREEN: save-document 5/5 (inclui herança + pré-fill editável), suíte 3015 pass / 0 fail. **1ª leitura cross-módulo financial→contracts** (via public-api, sem tocar ctr_* cru). Fecha a cadeia #116→#178→#48. 5 fixtures de teste ganharam o reader (vazio).
