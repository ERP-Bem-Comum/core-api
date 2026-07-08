# W0 — RED · BGP-PLAN-CRUD

> **Skill:** tdd-strategist · **Data:** 2026-07-02 · **Resultado:** RED ✅ (6/6 arquivos falham)

## Arquivos criados

| Arquivo | Cobre |
| --- | --- |
| `tests/modules/budget-plans/domain/budget-plan/budget-plan.test.ts` | Agregado puro: `create` nasce `RASCUNHO` v`1.0` (CA1), ano inválido, `addBudget` com invariante 1-por-parceiro (estado XOR município), `total` = Σ budgets (CA4), VO `PlanVersion` (`initial`/`format`), refs cross-BC rehydrate-only |
| `tests/modules/budget-plans/application/use-cases/_support.ts` | Fakes: `InMemoryBudgetPlanRepository`, `InMemoryProgramCatalog`, `InMemoryPartnerNetwork`, clock fixo 2026-07-02 |
| `.../use-cases/create-budget-plan.test.ts` | CA1 sucesso+evento+persistência; CA2 duplicado `(year, programRef)` → `budget-plan-already-exists`; `program-not-found`; `program-not-active`; ref malformada; ano inválido; combinações permitidas (ano≠, programa≠) |
| `.../use-cases/list-budget-plans.test.ts` | CA3: item com `status/programName/year/version/totalInCents`; filtros `year`/`programRef`/`status`; lista vazia |
| `.../use-cases/get-budget-plan.test.ts` | CA4: cabeçalho + budgets por Rede semeados via domínio+repo, `totalInCents` = 80.000; budgets vazios na criação; `budget-plan-not-found`; id malformado |
| `.../use-cases/get-budget-plan-options.test.ts` | CA5: programas **ativos**, `years` = anos dos planos ∪ {corrente, corrente+1} (dedup, asc), redes estados+municípios com `kind` |
| `tests/modules/budget-plans/adapters/http/budget-plans.routes.test.ts` | Contrato HTTP `/api/v2/budget-plans`: POST 401/403/201/409/404(programa)/422(inativo)/4xx-validação; GET lista 401/403/200+filtro; GET options 200/401; GET :id 200/404. Auth real (memory) — teste-âncora das permissões no `PermissionCatalog` |

## Superfície de API definida pelos testes (contrato do W1)

- `domain/shared/budget-plan-id.ts` (`generate`), `budget-id.ts`, `refs.ts` (`ProgramRef`, `PartnerStateRef`, `PartnerMunicipalityRef`, erro `budget-plan-ref-invalid`)
- `domain/budget-plan/`: `budget-plan.ts` (`BudgetPlan.create/addBudget/total`), `version.ts` (`initial/format`), `types.ts` (`BudgetPartner`), `repository.ts`
- `application/ports/`: `program-catalog.ts`, `partner-network.ts`
- `application/use-cases/`: `create-budget-plan.ts`, `list-budget-plans.ts`, `get-budget-plan.ts`, `get-budget-plan-options.ts`
- `adapters/persistence/repos/budget-plan-repository.in-memory.ts`, `adapters/catalog/program-catalog.in-memory.ts`, `adapters/network/partner-network.in-memory.ts`
- `public-api/`: `http.ts` (`budgetPlansHttpPlugin`, `buildBudgetPlansHttpDeps` com `seed` no driver memory), `permissions.ts` (`BUDGET_PLAN_PERMISSION`)

## Mapeamento de erro HTTP decidido

`program-not-found` → 404 · `program-not-active` → 422 · `budget-plan-already-exists` → 409 · `budget-plan-not-found` → 404 · body malformado → 400/422 (Zod na borda).

## Confirmação RED

```
node --test --experimental-strip-types --no-warnings 'tests/modules/budget-plans/**/*.test.ts'
ℹ tests 6 · pass 0 · fail 6   (ERR_MODULE_NOT_FOUND: src/modules/budget-plans/… não existe)
```

Nenhum teste passa antes da implementação — RED íntegro.
