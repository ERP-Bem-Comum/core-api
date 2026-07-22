# W1 — Implementação (GREEN) · BGP-ITEM-PROJECTIONS (#372)

**Agente:** fastify-server-expert. Projeção pura — nenhum arquivo de persistência/repo/migration tocado.

## Arquivos
- `application/use-cases/list-budget-plans.ts` — `BudgetPlanListItem` ganhou `partnersCount: number` + `networkKind: 'state'|'municipality'|'mixed'|null`; helper puro `deriveNetworkKind(budgets)` (via `Set` sobre `budget.partner.kind`, no próprio use case = projeção de apresentação); `toItem` projeta ambos (`plan.budgets.length` já hidratado, sem query nova).
- `adapters/http/schemas.ts` — `budgetPlanListItemSchema`: `partnersCount: z.number().int().nonnegative()` + `networkKind: z.enum(['state','municipality','mixed']).nullable()`.
- `adapters/http/budget-plan-dto.ts` — `budgetPlanListItemToDto` projeta os 2 campos.

## Regra networkKind
vazio → `null` · 1 kind → esse kind · 2 kinds → `'mixed'`. Aditivo (back-compat).

## Gate
```
format: limpo · lint: limpo · typecheck: limpo
teste #372: 5/5 pass · suíte do módulo: fail 0 (sem regressão)
```
GREEN. Próximo: W2 (zod-expert, audit read-only do schema/projeção).
