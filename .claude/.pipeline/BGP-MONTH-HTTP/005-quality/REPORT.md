# W3 — Gate de Qualidade · BGP-MONTH-HTTP (#413)

**Agente/Skill:** `ts-quality-checker` · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Os 4 comandos — saída integral

### 1/4 — `pnpm run typecheck`

```
$ tsc --noEmit
```

✅ **0 erros.**

### 2/4 — `pnpm run format:check`

```
All matched files use Prettier code style!
```

✅ **Sem divergência.**

### 3/4 — `pnpm run lint`

```
$ eslint .
```

✅ **0 problemas.** _(No W2 acusou 3 — `no-unnecessary-condition`, `prefer-optional-chain` e `init-declarations` — todos corrigidos no round 2, não silenciados.)_

### 4/4 — `pnpm test`

```
ℹ tests 4076
ℹ suites 1157
ℹ pass 4053
ℹ fail 0
ℹ skipped 18
```

✅ **0 falhas.**

## Regressão zero (constituição §II)

| Métrica | Antes | Depois | Veredito |
| :--- | ---: | ---: | :--- |
| Testes | 4071 | **4076** | **+5** (os 5 casos da US2) |
| Falhas | 0 | **0** | ✅ |
| Skipped | 18 | **18** | ✅ inalterado — nada novo silenciado |

## Critérios de aceite — 6/6

| CA | Estado | Evidência (`fastify.inject`) |
| :-- | :--- | :--- |
| **CA1** — `month` no item do GET | ✅ | `items[0].month === 3` |
| **CA2** — `month` na 201 do POST | ✅ | body `.month === 7` |
| **CA3** — `?month=3` filtra + total do recorte | ✅ | 1 item · `totalInCents` = 104500 |
| **CA4** — query inválida → 400 | ✅ | `banana`, `0`, `13`, `3.5`, `-1` |
| **CA5** — sem filtro = ano inteiro | ✅ | 12 itens numa ida |
| **CA6** — total = soma dos 12 | ✅ | **4.405.104** — prova da P.O. (#454) |

## Entregue

4 arquivos, **+50/−5**: `budget-result-dto.ts` (`month` na saída — alcança as 5 rotas), `schemas.ts` (`month` na response + `budgetResultByBudgetQuerySchema`), `plugin.ts` (`querystring` + repasse), `get-budget-results.ts` (filtro; total acompanha o recorte).

## Validação em MySQL real

**N/A nesta fatia** — nenhuma mudança de schema, migration ou repositório. A camada de persistência foi validada em MySQL 8.4 real na fatia 2 (`BGP-MONTH-PERSIST`, 10/10). Aqui a borda é exercitada de ponta a ponta por `fastify.inject` (Zod + rota + authz + use case), sem mock.

## Veredito

**GREEN** — pronto para `pipeline:state close`.

## Feature 036 — as 3 fatias fechadas

| Fatia | Ticket | Size | Estado |
| :-- | :--- | :--- | :--- |
| 1 | `BGP-MONTH-VO` | S | ✅ closed-green |
| 2 | `BGP-MONTH-PERSIST` | M | ✅ closed-green |
| 3 | `BGP-MONTH-HTTP` | S | ✅ **closed-green** |

**O #413 está implementado ponta a ponta**: VO → agregado → banco (com `UNIQUE` + upsert idempotente) → contrato de escrita → leitura do grid.

## Pendências (fora desta fatia, registradas)

1. 🔴 **#374** — sem `BUDGET_PLANS_DRIVER`/`_DATABASE_URL` no deploy de produção, o mensal é entregue e o dado **continua sumindo no restart**. QA ✅; produção aguarda segredo + deploy (taskdef mergeado em ERP-INFRA#20).
2. 🔴 **Clarification da spec 030 `:37`** (folha `DESPESAS_PESSOAIS` × "Qtd de {subcategoria}") — o cálculo persiste 12× por conta; divergência de fórmula corrompe dado real. Sem resposta desde 2026-07-01.
3. 🟡 **Spec 030 `:74`** — Success Criteria de paridade: a de **fórmula** continua, a de **grão** foi abandonada (FR-013). Dívida documental (T031).
4. 🟡 **T030** — investigar se `BudgetPlan.total` (soma `bgp_budgets.value_cents`) diverge de `getBudgetResults.total` (soma os results). **Pré-existente**; se divergir, abrir issue (ADR-0040).
