# W1 — GREEN (em progresso) · BDG-BUDGET-CALC (#317)

Skills/agentes: `ts-domain-modeler` (domínio) · `drizzle-schema-author` (schema) · `drizzle-orm-expert` (decisão de FK, ver DESIGN-DECISIONS.md).

## Entregue e verde (18 testes novos; 86 no módulo, 0 regressão)

### Domínio (`domain/budget-result/`)
- `calc-model.ts` — discriminated union `CalcModelInput` (discriminante = `LaunchType`), `calculate` (4 fórmulas
  em paridade 1:1 com `../../ERP-BACKEND/.../calc-total-value-result.ts`, `Math.round` antes de `Money`), guard
  `ensureMatchesLaunchType`. **7 testes** (paridade dos 4 + arredondamento + mismatch).
- `budget-result.ts` + `budget-result-id.ts` — entidade + smart constructor `create` (guard + cálculo). **2 testes.**

### Aplicação (`application/`)
- `use-cases/add-budget-result.ts` — validar ids → `budgetReader.exists` (D3) → `subcategoryReader.launchTypeOf`
  → `BudgetResult.create` → `budgetResultRepo.add`. **5 testes** (cálculo, mismatch, budget-not-found,
  subcategory-not-found, id-invalid).
- `ports/subcategory-launch-type-reader.ts` · `ports/budget-exists-reader.ts` (ISP).

### Adapters (`adapters/persistence/`)
- `schemas/mysql.ts` — tabela `bgp_budget_results` (SEM FK, D1; índices explícitos; CHECK no model; bigint cents).
- `migrations/mysql/0002_quick_spacker_dave.sql` — charset/collate manual (utf8mb4_bin nas 3 UUID; ENGINE/CHARSET).
- 3 adapters in-memory (budget-result-repo com add/list/delete; subcategory-launch-type-reader; budget-exists-reader).
- `budget-result-repository.suite.ts` + `.inmemory.test.ts` — round-trip + CA3 (isolamento) + CA4 (delete). **4 testes.**

## Decisões (ver 001-research/DESIGN-DECISIONS.md)
- **D1** sem FK física (refs por identidade; pai sofre replace-all) — precedente `fin_reconciliation_items`.
- **D2** CA4 = delete explícito (`deleteByBudgetId`), não cascade.
- **D3** gap fechado: `BudgetExistsReader` valida existência do orçamento sem FK.

### Persistência Drizzle (entregue — typecheck + format + lint + 124 testes do módulo verdes)
- `mappers/budget-result.mapper.ts` — `toInsert` + `fromRow` (rehydrate ids + isLaunchType + Money.fromCents → Result).
- `repos/budget-result-repository.drizzle.ts` — add/listByBudgetId/deleteByBudgetId (helper `safe`, ORDER BY id).
- `repos/subcategory-launch-type-reader.drizzle.ts` (`SELECT launch_type FROM bgp_subcategories`) +
  `repos/budget-exists-reader.drizzle.ts` (`SELECT id FROM bgp_budgets`).
- `budget-result.drizzle-mysql.test.ts` (consome a suite, gateado por `MYSQL_INTEGRATION=1`).
- **Runner:** adicionada a suíte `budget-plans` em `scripts/ci/test-integration.ts` (também registra o
  cost-structure da #316, que estava órfão).

### Borda HTTP — POST (entregue — typecheck + format + lint + 132 testes do módulo verdes)
- Schemas Zod dos 4 modelos revisados pelo `zod-expert` (achados endereçados, ver ZOD-BORDA-REVIEW.md).
- `budget-result-dto.ts` + wiring no `composition.ts` (memory: readers semeados via `BudgetPlansSeed`
  estendido; mysql: readers Drizzle) + `addBudgetResult` nos deps.
- 4 rotas `POST /budget-plans/budget-results/{ipca,caed,personal-expenses,logistics-expenses}` + mapa
  erro→HTTP (calc-model-mismatch→400, budget/subcategory-not-found→404, overflow→422, infra→503).
- `budget-result.routes.test.ts` — 8 testes (401/403, CA1 paridade, CA2 mismatch 400, not-found 404, Zod 400).

### CA3 (GET) + CA4 (DELETE) + budget CRUD — entregue (142 testes do módulo verdes)
- **CA3**: `get-budget-results.ts` + `GET /budget-plans/budget-results/by-budget/:budgetId` (lista + `totalInCents`).
- **Parte 1 (budget)**: `add-budget.ts` + `POST /budget-plans/:id/budgets`; `removeBudget` no domínio.
- **CA4**: `delete-budget.ts` + `DELETE /budget-plans/:id/budgets/:budgetId` (204) — remove orçamento **e**
  resultados (`deleteByBudgetId`, D2). Provado por teste de use case (`delete-budget.test.ts`) + HTTP.
- Testes HTTP: `budget-result.routes.test.ts` (11), `budget-crud.routes.test.ts` (5).

## Escopo diferido (decisão P.O. — issue-report)
- CA3 avançado: GET por **categoria/subcategoria** (filtros) e **ano-anterior** (casa por nome+categoria
  no plano do ano anterior — navegação cross-plano). Não bloqueia "Calculando Gastos" por budget.

## Falta para fechar o ticket
- **Validação MySQL real no x99** (autorização) — `test:integration:budget-plans` (migration 0002 + mapper).
- **W2** (`code-reviewer` + `zod-expert` + `fastify-server-expert`) → **W3** (gate).

## Follow-up (issue-report, fora do escopo)
- Atualizar `drizzle-schema-author/SKILL.md`: documentar "Soft FK cross-agregado intra-módulo (pai replace-all)".
