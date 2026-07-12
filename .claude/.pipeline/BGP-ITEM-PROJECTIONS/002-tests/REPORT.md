# W0 — Testes RED · BGP-ITEM-PROJECTIONS (#372)

**Skill:** tdd-strategist. **Arquivo:** `tests/modules/budget-plans/adapters/http/item-projections.routes.test.ts`.

## Contrato (CA1..CA3)
Projeção no item de `GET /budget-plans`:
- **CA1:** `partnersCount` (= `plan.budgets.length`); plano sem budgets → 0.
- **CA2:** `networkKind` de `plan.budgets[].partner.kind` — só state → `'state'`; só municipality → `'municipality'`; ambos → `'mixed'`; vazio → `null`.
- **CA3:** aditivo — campos legados do item permanecem.

5 casos: sem budgets (0/null), 2 states (2/'state'), 1 municipality (1/'municipality'), state+municipality (2/'mixed'), aditividade. Budgets criados via `POST /:id/budgets`.

**#373 SEPARADO** (updatedByRef exige migration + captura do ator; não é projeção).

## RED confirmado
```
tests 5 · pass 0 · fail 5
```
Todos falham — `partnersCount`/`networkKind` não existem no item nem no schema. RED válido. Próximo: W1 amplia `BudgetPlanListItem` + `toItem` + schema + DTO.
