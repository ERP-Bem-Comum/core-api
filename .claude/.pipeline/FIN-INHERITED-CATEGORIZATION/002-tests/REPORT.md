# W0 — Testes RED · FIN-INHERITED-CATEGORIZATION (#48, fatia CA2)

**Agente**: tdd-strategist · **Data**: 2026-06-20 · branch `feat/financial-inherited-categorization`.

Fatia escolhida (humano): **CA2 — herdar a categorização do contrato vinculado** (o payoff de #116/#178). `dataEmissao` (CA1) já foi feito no #163; `competencia`/`contaDebitoId` (CA1) ficam fora (precisam de modelagem própria).

| Camada | Teste RED |
| --- | --- |
| Application | `use-cases/save-document.test.ts` — (1) `contractRef` setado + sem `programRef`/`budgetPlanRef` → herda do contrato; (2) ref do front prevalece (pré-fill editável). RED (use-case não consulta o contrato). |

**Mapeamento:** só `contract.programId → programRef` e `contract.budgetPlanId → budgetPlanRef` mapeiam limpo (ambos refs uuid). `categorizacao`/`centroDeCusto` do contrato são rótulos livres sem campo-ref no documento → fora desta fatia.
