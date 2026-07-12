# W1 — Implementação (GREEN) · BGP-SCENARIO-CHILDREN (#401)

**Agente:** fastify-server-expert (implementação da borda + use case). Correções de lint (gate) na sessão principal.

## Arquivos
- **Novo** `application/use-cases/list-scenario-children.ts` — `listScenarioChildren(deps)(rawId)`: `rehydrate` → `findById` (null → `budget-plan-not-found`, distingue de "sem filhos") → `listChildren` → ordena por `(major, minor)` inteiro → mapeia (`BudgetPlan.total(plan).cents`, `PlanVersion.format`).
- `adapters/http/schemas.ts` — `budgetPlanChildSchema` + `budgetPlanChildrenResponseSchema` (Zod v4, reusa `budgetPlanStatusSchema`).
- `adapters/http/plugin.ts` — rota `GET /budget-plans/:id/children` (após `/:id/cost-structure`), `preHandler: [requireAuth, authorize(read)]`, erro via `sendWriteError` (`budget-plan-not-found → 404` já mapeado).
- `adapters/http/composition.ts` — wiring de `listScenarioChildren({ planRepo })`.

## Decisões
- Use case já devolve o shape do schema → handler passa `result.value` direto (sem DTO redundante).
- `:id` malformado → 400 (Zod `budgetPlanIdParamSchema`); bem-formado inexistente → 404 (use case).
- Ordenação por VO `{major, minor}` (numérica, robusta a ≥10), não string.

## Correções de gate (sessão principal — hooks não rodam em edições de sub-agente)
- `list-scenario-children.ts`: `||` de sort → check explícito `byMajor !== 0 ? ...` (strict-boolean-expressions).
- teste: `type ChildDto` → `interface` (consistent-type-definitions); acesso por propriedade (no-unsafe-member-access).

## Gate
```
lint: limpo · typecheck: limpo · format: limpo
teste #401: 8/8 pass · suíte do módulo: 211/211 (sem regressão)
```
GREEN. Próximo: W2 (zod-expert, audit read-only da borda/schema).
