# W1 — Implementação (#458)

> Agente: `ts-domain-modeler` (agregado) + `drizzle-orm-expert` (SUM/GROUP BY) · Resultado: **GREEN**.

## O que mudou (transversal — 20+ arquivos, uma decisão)

| Camada | Mudança |
| :--- | :--- |
| **Domínio** | `Budget` perde `value` → `{ id, partner }`; `addBudget` perde o input de valor; `BudgetPlan.total` **removido** do agregado |
| **Read-model** | `application/read-models/plan-total.ts` — `planTotalCents(plan, sums)` + `budgetIdsOf(plans)` |
| **Port** | `BudgetResultRepository.sumByBudgetIds(ids)` — `SUM … GROUP BY budget_id`, em lote |
| **Adapters** | drizzle (GROUP BY) + in-memory; **DROP** `bgp_budgets.value_cents` (migration 0008) |
| **Use cases** | 6 ganham `budgetResultRepo` e derivam o total: list, detalhe, consolidado, insights, scenario-children, approve |
| **Borda** | `addBudgetBodySchema` perde `valueInCents`; `valueInCents` por Rede vira derivado; total do plano idem |

## O ponto arquitetural: o total saiu do agregado

`BudgetPlan.total` era `Σ budgets[].value` — função pura do agregado. Com o valor saindo, a soma passa
a depender dos `budget_results`, que vivem em **outro** repositório. `planTotalCents(plan, sums)` é
pura (recebe o mapa, não faz I/O) mas vive no **application** porque cruza dois agregados do módulo.

## `sumByBudgetIds` — a query que evita o N+1

Uma agregação para a página inteira, não uma por plano. O `list-budget-plans` coleta os budgetIds de
todos os planos da página (`budgetIdsOf`) e faz **uma** `sumByBudgetIds`. Idem consolidado e insights
(plano atual + anteriores num batch). Detalhes de runtime travados por comentário no código:

- **`sql<string>`, não `sql<number>`**: o mysql2 devolve `SUM` (agregado sobre BIGINT) como string. A
  anotação honesta com o runtime evita o `Number()` virar "cast redundante" (lint) e reconstrói o cents.
- **Lista vazia → mapa vazio sem tocar o banco**: `inArray(col, [])` viraria `WHERE false` e ainda
  custaria um round-trip; alguns dialetos tratam `IN ()` como erro de sintaxe.

## Correção de rota no W1 — o in-memory tinha dois "budget" desconectados

Meus testes de borda falharam com `404` ao lançar num budget criado via POST. Causa: no in-memory o
`BudgetExistsReader` era um **seed fixo de ids**, desconectado do `planRepo` — um budget criado em
runtime não era reconhecido para lançar (no drizzle os dois leem `bgp_budgets`, então lá era
consistente). **Cura correta** (não workaround no teste): o reader in-memory passou a consultar
também o store dos planos (`hasBudget`), mantendo o seed legado. Agora reader e planRepo concordam,
como no drizzle.

## Migration

```sql
ALTER TABLE `bgp_budgets` DROP COLUMN `value_cents`;
```

Gerada pelo drizzle-kit. **Greenfield**: nenhum ambiente tem plano com orçamento (#374); em QA a
coluna era sempre 0 (o front manda `valueInCents: 0`). DROP não perde dado.

## Correção de testes — delegada, com o critério certo

Um subagente ajustou as fixtures (~51 erros de typecheck em 15 arquivos): remover `value` dos
`addBudget`, `valueCents` das rows, adicionar `budgetResultRepo` às deps. As asserções de `.total`
que somavam o **informado** foram trocadas por **0** (sem lançamentos semeados) com comentário
apontando para a cobertura real (`budget-total-derived.routes.test.ts`). 3 testes de **rota**
(fora do typecheck) ainda esperavam o informado — ajustados na sessão principal, e o CA7 (insights
derivado) que um deles deixou de provar foi **adicionado** ao teste dedicado.

> Nota de processo: o subagente rodou só `typecheck` (instruído), então deixou imports órfãos
> (`Money`, `cents`) e um `sql<number>` que o **lint** pegou depois — corrigidos na sessão principal.
> Confirma a lição: edits de subagente não passam pelo hook; rodar lint/format na principal.

## Validação em MySQL real (8.4) — 36/36

Container descartável. O `budget-total-derived.routes.test.ts` roda no `pnpm test` puro (in-memory).
As suítes drizzle hardcodam `127.0.0.1:3306` → receita: parar `core-api-mysql` → descartável na 3306
→ validar → **restaurar** (feito, `Up (healthy)`). O `sumByBudgetIds` na suíte de contrato +
`consolidated`/`remove-budget-atomic`/`plan-lifecycle` — todos verdes com a coluna já dropada.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` → **4160 testes, fail 0** (baseline 4146 +
14, incluindo o CA7 novo).

## Próxima wave

**W2** — `code-reviewer` (read-only). Pontos a esticar: o N+1 realmente sumiu? O `sumByBudgetIds`
overflow (SUM sobre BIGINT → JS number)? A paridade in-memory × drizzle do `hasBudget`?
