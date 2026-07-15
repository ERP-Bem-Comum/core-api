# BGP-LIST-NEST-SCENARIOS — W1 (implementação até GREEN) — REPORT

> Ticket #423. Wave W1 — agente `fastify-server-expert` (par Zod na borda) + filtro `isNull` no adapter
> Drizzle. Objetivo: fazer os 7 testes RED do W0 ficarem GREEN implementando o mínimo (YAGNI), sem
> migration (colunas `parent_id`/`scenario_name` já existem e já são hidratadas).

## Resultado

**GREEN confirmado.** `pnpm test` completo: **4025 testes, 4006 pass, 0 fail, 19 skipped, 0 cancelled**.
Os 7 fails do W0 viraram verde e **nenhum vermelho novo**. Os 19 skips continuam os pré-existentes/alheios
(opt-ins `MYSQL_INTEGRATION`/`NOTIFICATIONS_INTEGRATION`/`STORAGE_INTEGRATION`, fixtures PDF LGPD, compose).
`typecheck`, `lint` e `format:check` verdes.

## Arquivos alterados (7 — só produção, sem migration)

**A. Dois campos novos no item da lista (aditivo — molde #372):**

1. `application/use-cases/list-budget-plans.ts` — `ListBudgetPlansInput` += `rootsOnly?: boolean`;
   `BudgetPlanListItem` += `parentId`/`scenarioName`; `toItem` projeta
   `parentId: plan.parentId === null ? null : String(plan.parentId)` + `scenarioName: plan.scenarioName`;
   `query` repassa `rootsOnly` quando presente.
2. `adapters/http/schemas.ts` — `budgetPlanListItemSchema` += `parentId: z.uuid().nullable()` +
   `scenarioName: z.string().nullable()`.
3. `adapters/http/budget-plan-dto.ts` — `budgetPlanListItemToDto` repassa os 2 campos.

**B. Filtro `rootsOnly` opcional:**

4. `domain/budget-plan/repository.ts` — `ListBudgetPlansQuery` += `rootsOnly?: boolean`.
5. `adapters/http/schemas.ts` — `listBudgetPlansQuerySchema` += `rootsOnly: z.stringbool().optional()`
   (coerção estrita — ver abaixo).
6. `adapters/persistence/repos/budget-plan-repository.drizzle.ts` — `listWhere` adiciona
   `isNull(schema.budgetPlans.parentId)` quando `query.rootsOnly === true` (usa o índice
   `bgp_budget_plans_parent_id_idx`). Aplica em `count(*)` e no SELECT paginado.
7. `adapters/persistence/repos/budget-plan-repository.in-memory.ts` — `matchesQuery` +=
   `if (query.rootsOnly === true && p.parentId !== null) return false;`.

**Achado do W0 resolvido:** o handler `GET /budget-plans` em `plugin.ts` (~L173-179) agora repassa
`...(q.rootsOnly !== undefined ? { rootsOnly: q.rootsOnly } : {})` ao `ListBudgetPlansInput`. Sem isso o
param era validado mas não chegava ao repo.

## Coerção ESTRITA do CA4 (rootsOnly não-booleano → 400)

**`z.stringbool()`** (Zod v4.4.3, confirmado em `node_modules/zod/package.json`), com `.optional()`.
Comportamento verificado em runtime:

```
"true"     => ok  value=true
"false"    => ok  value=false
"banana"   => FAIL (issue → 400 na borda)
undefined  => ok  value=undefined   (ausente = comportamento CA1, lista completa flat)
```

`z.stringbool()` só aceita `'true'`/`'false'` — o oposto de `z.coerce.boolean()` (que faria
`Boolean('banana') === true` → 200 e quebraria o CA4).

## Invariantes preservados

- **Não-regressão do default:** sem param (ou `rootsOnly=false`) a lista traz tudo flat (CA1). Campos
  legados intactos; os novos são puramente aditivos. Ordenação `desc(updatedAt)` mantida.
- Sintaxe TS: `import type`, extensão `.ts`, `#src/*`, `exactOptionalPropertyTypes`. Comentário só p/
  "porquê". Sem citação de ticket no código de produção.

## Saídas REAIS

```
$ pnpm test
ℹ tests 4025 · suites 1145 · pass 4006 · fail 0 · cancelled 0 · skipped 19 · todo 0

3 arquivos do ticket (isolado): tests 12 / pass 12 / fail 0
  ✔ CA2 parentId/scenarioName (raiz null; cenário UUID/string)
  ✔ CA2 aditivo (legados presentes, novos entram)
  ✔ CA3 ?rootsOnly=true só raízes
  ✔ CA1 sem param = tudo (não-regressão)
  ✔ CA4 rootsOnly não-booleano → 400
  ✔ unit CA2 + CA3

$ pnpm run typecheck  → tsc --noEmit (sem erros)
$ pnpm run lint       → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
```

## O que o W2 deve auditar

- **Não-regressão do default (CA1):** `rootsOnly` ausente/`false` não altera o `where` (drizzle nem
  in-memory) — o filtro só entra sob `=== true`; 5 testes legados de `listBudgetPlans` seguem verdes.
- **CA4 / coerção estrita:** `z.stringbool().optional()` rejeita não-booleanos (400); `.optional()`
  preserva "ausente = tudo".
- **Aditividade:** 2 campos novos entram sem tocar legados; nenhum `.strict()` removido.
- **CA5 (W3):** filtro em MySQL real + EXPLAIN usando `bgp_budget_plans_parent_id_idx`.
