# BGP-LIST-NEST-SCENARIOS — W0 (RED) — REPORT

> Ticket #423. Wave W0 (fail-first) — skill `tdd-strategist`. Objetivo: testes RED que falham pela
> semântica nova ausente (`parentId`/`scenarioName` no item + filtro `rootsOnly`), NUNCA por
> sintaxe/import. `src/` NÃO foi tocado.

## Resultado

**RED confirmado.** `pnpm test` completo: **4025 testes, 3999 pass, 7 fail, 19 skipped, 0 cancelled**.
Os **7 fails são exatamente os testes novos** deste ticket; **nenhum vermelho alheio** foi introduzido.
Os 19 skips são **pré-existentes/alheios** (opt-ins `MYSQL_INTEGRATION`/`NOTIFICATIONS_INTEGRATION`/
`STORAGE_INTEGRATION`, fixtures PDF LGPD gitignored, PoolRegistry compose) — os testes novos **não
adicionam nenhum skip**.

Todas as falhas são **assertion (ERR_ASSERTION)** sobre valores/status — semânticas, não de import/parse
(o `--experimental-strip-types` não faz typecheck, então referenciar API-alvo ainda inexistente falha em
runtime pelo valor, não no load).

## Arquivos criados/alterados (só `tests/`)

1. **CRIADO** — `tests/modules/budget-plans/adapters/http/nest-scenarios.routes.test.ts`
   HTTP `fastify.inject` (molde `item-projections.routes.test.ts` #372 + `scenario-children.routes.test.ts`
   #401). Seed `driver: 'memory'`, writer com `budget-plan:read`+`write`, 1 programa ETI. Cria raiz via
   `POST /budget-plans` e cenário via `POST /:id/scenery`.
2. **ALTERADO** — `tests/modules/budget-plans/application/use-cases/list-budget-plans.test.ts`
   Novos imports + helper `seedScenery` (deriva cenário via `BudgetPlan.createScenery` e salva direto no
   `planRepo` in-memory) + novo bloco `describe('listBudgetPlans — aninhar cenários (#423)')`. Os 5 testes
   legados permanecem intactos e verdes.
3. **ALTERADO** — `tests/modules/budget-plans/adapters/persistence/budget-plan-repository.suite.ts`
   Novo caso `listPaged: rootsOnly=true retorna só planos raiz (parent_id IS NULL)` na suíte
   parametrizada. Consumida por `inmemory.test.ts` (roda no `pnpm test` puro) **e** por
   `drizzle-mysql.test.ts` sob `MYSQL_INTEGRATION=1` (CA5, W3). Salva a raiz ANTES do cenário
   (FK auto-referente do drizzle exige o pai).

## Mapa CA → teste

| CA | Teste (arquivo) | Estado |
| :-- | :-- | :-- |
| **CA1** (sem param = tudo flat; não-regressão) | HTTP `CA1: sem param (e rootsOnly=false) retorna tudo` | **PASSA** (verde esperado — default inalterado) |
| **CA2** (item SEMPRE expõe parentId/scenarioName; legados intactos) | HTTP `CA2: cada item SEMPRE expõe parentId/scenarioName`; HTTP `CA2: campos são aditivos`; unit `CA2: item traz parentId/scenarioName` | **RED** (3) |
| **CA3** (rootsOnly=true → só raízes; false/ausente = tudo) | HTTP `CA3: ?rootsOnly=true retorna só planos raiz`; unit `CA3: rootsOnly filtra`; suite `listPaged: rootsOnly=true...` | **RED** (3) |
| **CA4** (rootsOnly não-booleano → 400) | HTTP `CA4: rootsOnly não-booleano → 400` | **RED** (1) |
| **CA5** (MySQL real) | suite roda também em `drizzle-mysql.test.ts` sob `MYSQL_INTEGRATION=1` | diferido ao W3 |

## Saída REAL do RED (assertions semânticas)

`pnpm test` (full): `ℹ tests 4025 / pass 3999 / fail 7 / skipped 19 / cancelled 0`. Os 7 leaf-fails:

```
✖ HTTP CA2 parentId/scenarioName        → actual: undefined, expected: null   (item sem os campos)
✖ HTTP CA2 aditivo                       → 'parentId'/'scenarioName' in item == false
✖ HTTP CA3 ?rootsOnly=true               → 2 !== 1  (filtro ausente; cenário aparece)
✖ HTTP CA4 rootsOnly=banana → 400        → 200 !== 400 (chave desconhecida descartada pelo z.object)
✖ SUITE listPaged rootsOnly (in-memory)  → 2 !== 1  (matchesQuery ignora rootsOnly)
✖ UNIT CA2 item parentId/scenarioName    → undefined !== null (toItem não projeta)
✖ UNIT CA3 rootsOnly filtra              → 2 !== 1  (use case não repassa rootsOnly)
```

(Rodada isolada dos 3 arquivos: `tests 22 / pass 15 / fail 7 / skipped 0` — os 7 são os novos; 15 verdes
= legados + CA1 não-regressão.)

## Decisões / dúvidas para o W1

- **Passthrough no plugin (ponto além dos "6", mas é do próprio ticket):** `plugin.ts` (`GET /budget-plans`,
  ~L170-179) monta `ListBudgetPlansInput` de `q.page/limit/year/status/programRef` — **NÃO repassa
  `rootsOnly`**. O handler precisa incluir `...(q.rootsOnly !== undefined ? { rootsOnly: q.rootsOnly } : {})`
  (padrão `exactOptionalPropertyTypes` já usado). Sem isso o schema aceita o param mas o filtro não chega
  ao repo.
- **CA4 exige coerção ESTRITA, NÃO `z.coerce.boolean()`:** `z.coerce.boolean()` mapeia qualquer string
  não-vazia para `true` (`Boolean('banana') === true`) → não rejeita, quebra CA4. Usar `z.stringbool()`
  (Zod v4) ou `z.enum(['true','false']).transform(...)` para que `rootsOnly=banana` → **400**. Manter
  `.optional()` (ausência = comportamento CA1).
- **Item aditivo:** `BudgetPlanListItem` + `toItem` (:22-34/:65-77) ganham
  `parentId` (via `plan.parentId === null ? null : String(plan.parentId)`, molde `lifecyclePlanToDto`) e
  `scenarioName: plan.scenarioName`. `budgetPlanListItemSchema` (schemas.ts :60-72) reusa o shape de
  `lifecyclePlanResponseSchema` :158-159. `budgetPlanListItemToDto` (:44-56) repassa os 2 campos.
- **Filtro no repo:** `ListBudgetPlansQuery` (repository.ts :11-17) + `ListBudgetPlansInput` ganham
  `rootsOnly?: boolean`; `listWhere` (drizzle :32-44) adiciona `isNull(parentId)` quando `rootsOnly === true`
  (usa `bgp_budget_plans_parent_id_idx`); `matchesQuery` (in-memory :12-19) idem.
- **Verde esperado pós-W1:** os 7 RED viram GREEN; CA1 permanece verde; `typecheck` (hoje vermelho de
  propósito) fecha ao implementar os 6 pontos + o passthrough.
