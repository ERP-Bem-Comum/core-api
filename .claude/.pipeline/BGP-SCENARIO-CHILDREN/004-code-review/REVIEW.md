# W2 — Code Review (read-only) · BGP-SCENARIO-CHILDREN (#401)

**Agente:** zod-expert (revisor de borda HTTP/schema, par do fastify-server-expert).

## Veredito: APPROVED

Sem Blocker/Major. Verificado:

1. **Use case** (`list-scenario-children.ts`): factory `(deps)=>(input)=>Promise<Result>`, sequência `rehydrate→findById→not-found→listChildren→map/sort`, sem `throw`, sem import de `adapters/`. `byVersionAscending` compara `major`/`minor` inteiros (evita bug lexicográfico "1.10"<"1.2"). Erros EN kebab.
2. **Schemas**: `budgetPlanChildSchema`/`budgetPlanChildrenResponseSchema` batem campo-a-campo com `BudgetPlanChildView` (sem response mismatch). `z.uuid()`, `status` reusa `budgetPlanStatusSchema`, `scenarioName` nullable, `totalInCents` int. `z.object` puro (strip) consistente com os vizinhos. **Sem vazamento** de campo interno (`parentId`/`budgets`/timestamps ficam de fora).
3. **Rota**: `budgetPlanIdParamSchema`, RBAC `budget-plan:read`, `sendWriteError`/`sendResult`. `budget-plan-not-found → 404` mapeado. Sem colisão find-my-way (`/:id/children` tem profundidade distinta, padrão de `cost-structure`/`insights`).
4. **Composition**: wiring em `BudgetPlansHttpDeps` + `makeDeps` para memory e mysql.
5. **Teste**: CA1/CA2/CA3 + RBAC (401/403/200), 8/8 pass. Typecheck limpo.

Nada a corrigir.
