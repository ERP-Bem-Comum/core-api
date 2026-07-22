# W0 — RED · BDG-PLAN-LIFECYCLE (#318, US4)

**Skill:** `tdd-strategist`. Escopo revisado (ver 000-request §ESCOPO REVISADO + 001-research).

## RED (sub-fatia W1-A — domínio da state machine)
`tests/modules/budget-plans/domain/budget-plan/lifecycle.test.ts` — 7 testes contra API inexistente:
- **CA1** `BudgetPlan.startCalibration`: APROVADO → filho EM_CALIBRACAO (version major+1, parentId=pai, aprovado intacto);
  não-APROVADO → `budget-plan-not-approved`; cenário → `budget-plan-is-scenario`.
- **CA4** `BudgetPlan.createScenery`: não-APROVADO → filho RASCUNHO (version minor+1, scenarioName); APROVADO → `budget-plan-already-approved`.
- **CA2** `BudgetPlan.approve`: → APROVADO; já-aprovado → `budget-plan-already-approved`.

Resultado: 7 fail por `startCalibration is not a function` (RED correto). GREEN aplicado no W1-A (mesmo commit lógico):
tipo `BudgetPlan` +`parentId`/`scenarioName`, 3 erros novos, 3 transições puras. 150 testes do módulo verdes.
