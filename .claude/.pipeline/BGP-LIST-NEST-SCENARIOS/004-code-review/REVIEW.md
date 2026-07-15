# Code Review — Ticket BGP-LIST-NEST-SCENARIOS (#423) — Round 1

**Veredito:** APPROVED
**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-15
**Escopo revisado (working tree, não commitado):**

- `application/use-cases/list-budget-plans.ts`
- `adapters/http/{schemas.ts, budget-plan-dto.ts, plugin.ts}`
- `domain/budget-plan/repository.ts`
- `adapters/persistence/repos/budget-plan-repository.{drizzle,in-memory}.ts`
- testes: `budget-plan-repository.suite.ts`, `list-budget-plans.test.ts`, `nest-scenarios.routes.test.ts` (novo)

---

## Foco 1 — Não-regressão do default (CRÍTICO) ✅

- **Drizzle** (`budget-plan-repository.drizzle.ts:44`): `isNull(schema.budgetPlans.parentId)` entra APENAS
  sob `query.rootsOnly === true`. Sem o param (ou `false`), o array `clauses` é idêntico ao de antes →
  `where` inalterado. O MESMO `where = listWhere(query)` alimenta `count(*)` (:138-140) e o SELECT paginado
  (:147-150) — count e página consistentes sob o filtro.
- **In-memory** (`budget-plan-repository.in-memory.ts:18`): `if (query.rootsOnly === true && p.parentId !== null)
  return false;` — guarda `=== true`, cláusula appended por último, não altera os predicados legados.
- Campos legados do item (partnersCount, networkKind, updatedByRef, version, totalInCents…) intactos.
  Ordenação `desc(updatedAt)` preservada. Os 5 testes legados de `listBudgetPlans` seguem sem edição.

## Foco 2 — CA4 / coerção estrita ✅

- `schemas.ts:52`: `rootsOnly: z.stringbool().optional()` — NÃO é `z.coerce.boolean()`. Aceita só
  `'true'`/`'false'`; `'banana'` → issue → 400 (assertado em `nest-scenarios.routes.test.ts:234-235`).
  `.optional()` preserva "ausente = lista completa flat" (CA1).
- Passthrough até o repo confirmado: `plugin.ts:179` repassa `rootsOnly` ao input quando definido →
  `list-budget-plans.ts:102` → `ListBudgetPlansQuery` → `listWhere`/`matchesQuery`. Com `rootsOnly=false`
  (`!== undefined`), trafega mas o filtro só dispara em `=== true` → lista completa.

## Foco 3 — Qualidade + aditividade ✅

- 2 campos novos entram em schema (`schemas.ts:75-76`), projeção (`list-budget-plans.ts:79-80`) e DTO
  (`budget-plan-dto.ts:56-57`) sem tocar legados.
- `parentId` projetado via `plan.parentId === null ? null : String(plan.parentId)` — desembrulha o branded
  `BudgetPlanId` (molde `updatedByRef`), não vaza tipo branded. `scenarioName` é `string | null` puro no
  domínio, repassado direto.
- Nenhum `.strict()` removido. Sintaxe TS OK (`isNull` já importado, `import type`, extensões `.ts`,
  `#src/*`). Comentários explicam só o "porquê"; nenhum ID de ticket no código de produção. Molde #372 seguido.

---

## O que está bom

- Filtro guardado por `=== true` nos DOIS adapters — retrocompatibilidade robusta por construção.
- Comentário em `schemas.ts:50-51` documenta a escolha `stringbool` vs `coerce.boolean` (o vetor exato do CA4).
- Cobertura HTTP cobre CA1 (sem param + `rootsOnly=false`), CA2 (sempre + aditivo), CA3 (só raízes), CA4 (400);
  o contract suite cobre CA3/CA5 no MySQL real.

## Achados

Nenhum Blocker/Major/Minor.

## Próximo passo

**APPROVED** → W3 (gate + integração MySQL real: `rootsOnly=true` exclui cenários + EXPLAIN usando
`bgp_budget_plans_parent_id_idx`, CA5).
