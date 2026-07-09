# BDG-BUDGET-CALC — Decisões de design da persistência

> Consultado o agente `drizzle-orm-expert` (fundamentado em código + ADR-0014/0020 + Evans).

## D1 — `bgp_budget_results` SEM FK física para `budget_id` e `subcategory_id`

`bgp_budgets` e `bgp_subcategories` são **reescritas por replace-all** (delete+insert) a cada
`save`/`mutate` (`budget-plan-repository.drizzle.ts:159`, `cost-structure-repository.drizzle.ts:88`).
Uma FK de `bgp_budget_results` para elas apagaria os resultados (cascade) ou travaria o save (restrict).

**Decisão:** referências por **identidade**, sem `foreignKey()` — exatamente o padrão já em produção de
`fin_reconciliation_items.payable_id` (referencia `fin_payables`, que sofre o mesmo replace-all em
`document-repository.drizzle.ts:279`). Fronteira de agregado: `BudgetResult` é agregado próprio
(`domain/budget-result/`), não filho de `BudgetPlan`/`CostStructure`. Sem ADR novo — convenção aceita.

Consequência: **índices explícitos** (`budget_id`, `subcategory_id`) — sem FK não há índice implícito.

## D2 — CA4 (`DELETE /budgets/:id` remove resultados) = delete explícito, não cascade

Sem FK, o delete dos `budget_results` do orçamento é feito no repo, na mesma transação, ANTES do
delete/replace do budget. Consistente com `document-repository.drizzle.ts:276` ("DELETE explícito:
não dependemos de CASCADE"). Desacopla da mecânica de delete do budget.

## D3 — Gap fechado: validação de existência do `budgetId`

Sem FK, a existência do `budgetId` deixa de ser garantida pelo banco. O use case só faz
`BudgetId.rehydrate` (formato). **Fecha-se com um port `BudgetExistsReader`** (ISP, molde do
`SubcategoryLaunchTypeReader`): o use case valida `exists(budgetId)` antes de `BudgetResult.create`.
Erro `budget-not-found`. A existência da subcategoria já era garantida pelo `SubcategoryLaunchTypeReader`.

## Follow-up (fora do escopo — issue-report)

Atualizar `drizzle-schema-author/SKILL.md`: a tabela de mapeamentos só documenta "Soft FK (cross-módulo)".
Falta "Soft FK (cross-agregado intra-módulo, quando o pai sofre replace-all)" — padrão de
`fin_reconciliation_items` e agora `bgp_budget_results`.
