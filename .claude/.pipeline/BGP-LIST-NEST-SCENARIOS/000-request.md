# BGP-LIST-NEST-SCENARIOS — escopo (#423)

> `GET /budget-plans` passa a permitir **aninhar cenários sob o plano-raiz** na lista de Planejamento.
> Size **S**. Branch `feat/423-budget-plans-nest-scenarios`. Prioridade da P.O. (Bloco 1 — Orçamento 100%).

## Problema (#423, validado no front)

A lista de Planejamento (`GET /budget-plans`) devolve **todos** os planos FLAT (raízes + cenários/filhos
misturados como linhas de topo), e o item **não expõe `parentId` nem `scenarioName`**. O front não
consegue: (1) saber quais linhas são filhas de quem, nem (2) recolher os cenários sob o pai (expansível).
O `GET /:id/children` (#401) sozinho não resolve — traz filhos de **um** plano por vez.

## Estado (levantado via Explore — nada a criar no schema)

- Colunas **já existem** e já são hidratadas: `bgp_budget_plans.parent_id` (nullable, raiz=null,
  `mysql.ts:43`) e `scenario_name` (nullable, só cenários, `mysql.ts:44`). Índice
  `bgp_budget_plans_parent_id_idx` (`:69`) e FK auto-referente já existem. **Sem migration.**
- Domínio já modela: `types.ts:30-31` (`parentId`/`scenarioName`); `scenarioName != null` identifica
  cenário; raiz e calibração têm `scenarioName = null`.
- `scenarioName` é **campo próprio** (não derivado de `version`/label) — **não há decisão de fonte**.

## Decisão de contrato (Gabriel, 2026-07-15)

**Filtro de raiz = query param OPCIONAL `rootsOnly` (retrocompatível).** A lista continua trazendo tudo
por padrão (nada quebra); o front passa `?rootsOnly=true` quando quiser só as raízes para o topo da
árvore, expandindo com `/children`. **NÃO** mudar o default para "só raízes" (quebraria consumidores que
esperam a lista completa flat). `parentId` + `scenarioName` entram **sempre** no item.

## Escopo (in) — molde exato do #372 (PR #419) + 1 filtro

**A. Dois campos novos no item da lista** (aditivo — o precedente #372 tocou exatamente estes 3 arquivos):
1. `application/use-cases/list-budget-plans.ts` — `BudgetPlanListItem` (`:22-34`) ganha
   `parentId: string | null` + `scenarioName: string | null`; `toItem` (`:65-77`) projeta
   `plan.parentId` (via `String()` quando não-nulo, molde `lifecyclePlanToDto`) e `plan.scenarioName`.
2. `adapters/http/schemas.ts` — `budgetPlanListItemSchema` (`:60-72`) ganha `parentId: z.uuid().nullable()`
   + `scenarioName: z.string().nullable()` (reusar o shape de `lifecyclePlanResponseSchema:152-161`).
3. `adapters/http/budget-plan-dto.ts` — `budgetPlanListItemToDto` (`:44-56`) repassa os 2 campos.

**B. Filtro `rootsOnly` opcional:**
4. `ListBudgetPlansQuery` (`repository.ts:11-17`) + `listBudgetPlansQuerySchema` (`schemas.ts:44-50`) +
   `ListBudgetPlansInput`/`list-budget-plans.ts` ganham `rootsOnly?: boolean` (coerce de query string).
5. `budget-plan-repository.drizzle.ts` — `listWhere` (`:32-44`) adiciona `isNull(schema.budgetPlans.parentId)`
   **quando `query.rootsOnly === true`** (molde `findRootByYearAndProgram:119`, `isNull` já importado).
   Usa o índice `parent_id_idx`.
6. `budget-plan-repository.in-memory.ts` — `matchesQuery` (`:12-19`) replica: `p.parentId === null`
   quando `rootsOnly`.

## Fora de escopo

- Mudar o default da lista (decisão: opt-in). Reconstruir a árvore no backend (o front aninha com
  parentId + /children). Paginação/ordenação (mantém `desc(updatedAt)`). Tocar `/children` (#401).

## Critérios de aceite (Dado/Quando/Então)

- **CA1** — `GET /budget-plans` (sem param) retorna **tudo** como hoje (raízes + cenários flat) — não-regressão.
- **CA2** — Cada item **sempre** expõe `parentId` (null na raiz/calibração, UUID no cenário) e `scenarioName`
  (null na raiz/calibração, string no cenário). Campos legados (partnersCount, networkKind, updatedByRef…)
  intactos (aditivo).
- **CA3** — `GET /budget-plans?rootsOnly=true` retorna **só** os planos com `parent_id IS NULL` (cenários
  fora). `rootsOnly=false`/ausente = comportamento de CA1.
- **CA4** — Query inválida (`rootsOnly` não-booleano) → 400 (Zod). Response `.strict()` preservado.
- **CA5** — Filtro validado em **MySQL real**: `rootsOnly=true` exclui cenários; item traz parentId/scenarioName
  corretos no round-trip; EXPLAIN não vira full-scan (usa `parent_id_idx`).

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — HTTP (parentId/scenarioName no item + rootsOnly filtra) + unit use-case + repo contract (só raízes) |
| W1 | `fastify-server-expert` (par `zod-expert` no query/response) + `drizzle-orm-expert` (filtro isNull) | os 6 pontos; sem migration |
| W2 | `code-reviewer` | audit read-only (não-regressão do default + aditivo) |
| W3 | `ts-quality-checker` | gate + integração MySQL (rootsOnly + EXPLAIN), caminho não-destrutivo |

## DoD

Gate W3 verde + CA1–CA5 + sem migration + default da lista inalterado + validação MySQL real. Fecha #423.
