# BGP-READ-PORT — W1 (GREEN)

> Skill: `ports-and-adapters` (par: `drizzle-orm-expert`). Fatia 1/3 de `REPORTS-REALIZED-VS-PLANNED`.
> Implementação mínima até o vermelho do W0 virar verde. **Nenhuma asserção do W0 foi enfraquecida.**

## Arquivos

| Arquivo | O quê |
| :-- | :-- |
| `src/modules/budget-plans/application/ports/planned-amounts-read.ts` | **novo** — o port: `PlannedAmountRow`, `PlannedAmountsFilter`, `BudgetPlansReadError`, `PlannedAmountsReadPort` |
| `src/modules/budget-plans/adapters/persistence/repos/planned-amounts-read.drizzle.ts` | **novo** — reader Drizzle (query única, boundary `try/catch` → `Result`) |
| `src/modules/budget-plans/public-api/read.ts` | **novo** — `buildBudgetPlansReadPort` boot-scoped (pool 1× + `close()`) |
| `tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts` | **editado (2 fixtures, mecânico)** — ver §Desvio |

Camadas na ordem canônica: port (application) → adapter (persistence) → composição (public-api).
`read.ts` importa **só** driver + repo + tipos do port — nunca `../domain/` (o teste estrutural do W0
lê o fonte e confere).

## A query (uma só)

```sql
SELECT p.id, cc.id, cc.name, cat.id, cat.name, s.id, s.name, cal.m,
       COALESCE(SUM(r.value_cents), 0)
FROM       bgp_budget_plans   p
INNER JOIN bgp_cost_centers   cc  ON cc.budget_plan_id  = p.id
INNER JOIN bgp_categories     cat ON cat.cost_center_id = cc.id
INNER JOIN bgp_subcategories  s   ON s.category_id      = cat.id
CROSS JOIN (SELECT 1 AS m UNION ALL ... UNION ALL SELECT 12) AS cal
LEFT  JOIN bgp_budgets        b   ON b.budget_plan_id = p.id
                                  [AND b.partner_kind = ? AND b.partner_ref = ?]   -- filtro de Rede
LEFT  JOIN bgp_budget_results r   ON r.subcategory_id = s.id
                                 AND r.budget_id     = b.id
                                 AND r.month         = cal.m
WHERE    [p.id = ?] [AND p.year = ?] [AND p.program_ref = ?]                        -- filtros de plano
GROUP BY p.id, cc.id, cc.name, cat.id, cat.name, s.id, s.name, cal.m
ORDER BY cc.name, cc.id, cat.name, cat.id, s.name, s.id, cal.m
```

### Como a grade de 12 é garantida (CA3)

A árvore vem do **PLANO**, por `INNER JOIN` (`plans → cost_centers → categories → subcategories`), e é
multiplicada pelo calendário via `CROSS JOIN` **antes** de qualquer lançamento entrar. Os lançamentos
só chegam depois, por `LEFT JOIN`. Logo o número de linhas é `subcategorias_do_plano × 12`,
independente de existir `bgp_budget_results` — e `COALESCE(SUM(...), 0)` converte o "não casou" em `0`.
Nunca há `GROUP BY` sobre os resultados sozinhos.

### Como o filtro de Rede não mata as linhas zeradas

`partnerStateRef`/`partnerMunicipalityRef` viram predicados **no `ON` do `LEFT JOIN bgp_budgets`**, e
**não** no `WHERE`. No `ON`, o filtro decide apenas **quais Redes entram na soma**; as linhas da
estrutura continuam todas lá (com `plannedCents = 0` quando a Rede filtrada não tem lançamento). No
`WHERE`, ele descartaria as linhas cujo LEFT JOIN não casou e mataria o CA3.

### Outras decisões

- **Soma das Redes:** `r.budget_id = b.id` no `ON` faz cada `(budget, sub, mês)` entrar uma vez na
  `SUM` — estado 200 + município 50 = 250 — sem duplicar linha; o `GROUP BY` colapsa em `(sub, mês)`.
- **Sem FK** de `bgp_budget_results` para budgets/subcategories (D1 do #317): join por identidade.
- **Filtros de plano são AND**, montados por spread condicional (`exactOptionalPropertyTypes`).
- **Sem filtro por status de plano nem escolha de versão vigente** (nota 7 do W0) — quem escolhe é o
  consumidor, via `budgetPlanId`.
- **Ordenação é contrato:** nome (id como desempate determinístico) nos 3 níveis + `cal.m` ascendente.
- **`plannedCents` é `number`:** `SUM` sobre `BIGINT` volta string no mysql2; `Number()` no mapper
  reconstrói os cents. `month` já vem `number` (literais `INT` do calendário).
- **Boot-scoped:** `openBudgetPlansMysql({ applyMigrations: false })`, pool 1× no build, `close()` no
  port. Depois do `close()`, a query lança e o `try/catch` da borda vira `err(...)` — nunca reabre pool
  (Incident-0001).
- **ADR-0014:** só `bgp_*`; refs de Rede são opacos. **ADR-0006:** plain rows. **ADR-0020:** só features
  permitidas; **zero mudança no schema `bgp_*`** (CA7).

## ⚠️ Desvio a auditar no W2 (única edição fora de `src/`)

O W0 escreveu, em **duas** fixtures (`openPort`, `rowsOf`):

```ts
assert.equal(built.ok, true, '...');
if (!built.ok) throw new Error(`fixture: build falhou — ${built.error}`);
```

Com o módulo passando a existir, isso deixou de compilar: `assert.equal` importado como
`{ strict as assert }` é **assertion signature** (`asserts actual is T`), então após a linha do
`assert` o ramo `!built.ok` é `never` e `built.error` não existe → `TS2339`. Não há implementação de
`read.ts` que evite isso — é o tipo do `assert`, não o do port.

Correção: **inverter a ordem** (guard antes do assert), com comentário. Ambas as asserções continuam
lá, o runtime é idêntico, nenhuma expectativa foi enfraquecida, e o bloco vive dentro de
`if (integrationEnabled())`.

## Prova do GREEN (rodada e conferida no fio principal, não só pelo subagente)

```
ℹ tests 4249 · suites 1213 · pass 4230 · fail 0 · skipped 19 · duration_ms 167520
```

| | Baseline (W0 RED) | Agora (W1 GREEN) |
| :-- | :-- | :-- |
| tests | 4247 | **4249** (+2 · os 3 estruturais entraram, o failure de import saiu) |
| pass | 4227 | **4230** |
| fail | **1** | **0** |
| skipped | 19 | 19 |

Demais gates: `typecheck` limpo (eram 120+ `no-unsafe-*` no W0), `lint` limpo, `format:check`
"All matched files use Prettier code style!".

Integração (`MYSQL_INTEGRATION=1`) **não executada** — é W3.

## Notas para o W2

1. **Ler primeiro o §Desvio** — é a única edição em `tests/` feita no W1.
2. Fronteira ADR-0006: `read.ts` não importa `../domain/`; `PlannedAmountRow` só tem `string`/`number`.
3. Conferir `ON` vs `WHERE` do filtro de Rede no fonte do reader (armadilha nº 1 do ticket).
4. Conferir pool boot-scoped: `openBudgetPlansMysql` chamado **uma vez** (Incident-0001).
5. **Ponto de produto em aberto (não é bug, não consertar aqui):** `partnerStateRef` **+**
   `partnerMunicipalityRef` juntos devolvem a grade **zerada** (conjunção literal; uma Rede é estadual
   XOR municipal). Se a tela precisar de "as duas Redes somadas", é decisão da P.O. na fatia 3 →
   **issue**, não decisão de wave (ADR-0040).
6. Sem `EXPLAIN` nesta wave — o W0 (nota 4) pediu auditoria do plano no W3, com MySQL de pé.

## Próximo passo

W2 (REVIEW read-only) — `code-reviewer`.
