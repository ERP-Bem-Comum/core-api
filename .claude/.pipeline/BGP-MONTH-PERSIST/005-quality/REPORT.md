# W3 — Gate de Qualidade · BGP-MONTH-PERSIST (#413)

**Agente/Skill:** `ts-quality-checker` · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Os 4 comandos — saída integral

### 1/4 — `pnpm run typecheck`

```
$ tsc --noEmit
```

✅ **0 erros.** É também a prova do **CA6**: `create` sem `month` não compila.

### 2/4 — `pnpm run format:check`

```
All matched files use Prettier code style!
```

✅ **Sem divergência.**

> ⚠️ Precisou de intervenção: `_journal.json` e `0006_snapshot.json` — **gerados pelo drizzle-kit** — saíram fora do padrão Prettier. `prettier --write` neles. Arquivos gerados não passam pelo hook de formatação; conferir sempre depois de `db:generate`.

### 3/4 — `pnpm run lint`

```
$ eslint .
```

✅ **0 problemas.**

### 4/4 — `pnpm test`

```
ℹ tests 4071
ℹ suites 1157
ℹ pass 4048
ℹ fail 0
ℹ skipped 18
```

✅ **0 falhas.**

## 🔴 Regressão detectada e corrigida DENTRO do gate

A **primeira** execução do `pnpm test` acusou **7 falhas**:

```
✖ POST /budget-plans/budget-results/ipca — sem Authorization -> 401
✖ POST /budget-plans/budget-results/ipca — sem budget-plan:write -> 403
✖ POST /budget-plans/budget-results/ipca — CA1: IPCA calcula e persiste -> 201
✖ POST /budget-plans/budget-results/ipca — orçamento inexistente -> 404
✖ POST /budget-plans/budget-results/ipca — subcategoria inexistente -> 404
✖ POST /budget-plans/budget-results/logistics-expenses — CA1: logística calcula -> 201
✖ GET  /budget-plans/budget-results/by-budget/:budgetId — CA3: lista + soma

AssertionError: {"error":{"code":"validation","message":"Request validation failed"}}
400 !== 201
```

**Causa-raiz:** `budget-result.routes.test.ts` monta o body **sem `month`**, e o `budgetResultTargetSchema` passou a exigi-lo. **É regressão real** — a mudança de contrato quebrou os testes de borda existentes —, não "erro alheio".

**Correção:** `month: 1` no helper `ipcaPayload` e no payload literal de `logistics-expenses`. **Nenhum teste foi enfraquecido, pulado ou silenciado.**

**Por que os testes unitários não pegaram:** o Zod só roda na borda (`fastify.inject`). Reforça o valor de a suíte completa ser o gate — não só os testes da fatia.

## Regressão zero (constituição §II)

| Métrica | Antes | Depois | Veredito |
| :--- | ---: | ---: | :--- |
| Testes | 4062 | **4071** | **+9** (VO já contava; +6 do agregado/suíte, +3 da paridade) |
| Falhas | 0 | **0** | ✅ |
| Skipped | 18 | **18** | ✅ inalterado — nada novo foi silenciado |

## Validação em MySQL real (x99 offline → OrbStack)

**Método:** `docker stop core-api-mysql` → MySQL 8.4 avulso na 3306 com a senha do teste → validação → `docker rm -f` → `docker start core-api-mysql`. **Volume dev intacto** (69 tabelas conferidas). O `pnpm test:integration:*` **não** foi usado — ele faz `compose up` + _"SEMPRE derruba e limpa"_, o que destruiria a infra dev.

```
MYSQL_INTEGRATION=1 … budget-result.drizzle-mysql.test.ts
ℹ tests 10 · pass 10 · fail 0
  ✔ save devolve o registro persistido: no recálculo, o id é o da linha existente
  ✔ CA2: recalcular o mesmo (budget, subcategoria, mês) ATUALIZA — não duplica
  ✔ CA1/CA3: os 12 meses coexistem e somam o anual (3.670,92 × 12)
  ✔ alterar um mês não afeta os demais (FR-004)
  ✔ o upsert é por (budget, subcategoria, mês): contas distintas no mesmo mês coexistem
```

**Estrutura conferida no banco:**

```
UNIQUE KEY `bgp_budget_results_budget_subcategory_month_uq` (`budget_id`,`subcategory_id`,`month`)
`month` tinyint NOT NULL
CONSTRAINT `bgp_budget_results_month_chk` CHECK ((`month` between 1 and 12))
```

`bgp_budget_results_budget_id_idx` **não existe mais** (redundante — o UNIQUE é índice de prefixo).

**CA4 provado com INSERT direto:** `month=13` e `month=0` → `ERROR 3819: Check constraint 'bgp_budget_results_month_chk' is violated`.

## Critérios de aceite — 9/9

| CA | Estado | Onde |
| :-- | :--- | :--- |
| CA1 · CA2 · CA3 | ✅ | MySQL real + in-memory (paridade) |
| CA4 (CHECK) | ✅ | INSERT direto → `ERROR 3819` |
| CA5 (row corrompida) | ✅ | mapper via `ExerciseMonth.rehydrate` |
| CA6 (tipo) | ✅ | typecheck |
| CA7 · CA8 | ✅ | agregado |
| CA9 (paridade) | ✅ | a mesma suíte, 10/10 nos dois adapters |

## Veredito

**GREEN** — pronto para `pipeline:state close`.

## Herança para `BGP-MONTH-HTTP` (fatia 3)

A **escrita HTTP foi absorvida aqui** (o `month` obrigatório atravessa as 3 camadas de uma vez). Resta a **leitura (US2)**:

1. `month` na response do `GET by-budget` (o DTO ainda não o expõe).
2. `?month=` opcional na query (`z.coerce` — query é string).
3. Testes de borda da leitura.
