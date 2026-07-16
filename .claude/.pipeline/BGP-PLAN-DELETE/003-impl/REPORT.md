# W1 — Implementação (#453)

> Agente: `ts-domain-modeler` (guarda) + `drizzle-orm-expert` (transação) · Resultado: **GREEN**.

## Arquivos

| Arquivo | O quê |
| :--- | :--- |
| `domain/budget-plan/budget-plan.ts` | `+remove(plan, children)` — guarda pura |
| `domain/budget-plan/errors.ts` | `+'budget-plan-has-children'` |
| `domain/budget-plan/repository.ts` | `+remove(plan)` no port |
| `adapters/persistence/repos/budget-plan-repository.drizzle.ts` | `remove` — 1 transação |
| `adapters/persistence/repos/budget-plan-repository.in-memory.ts` | paridade |
| `application/use-cases/delete-budget-plan.ts` | **novo** |
| `adapters/http/plugin.ts` | `+DELETE /budget-plans/:id` · `has-children → 409` |
| `adapters/http/composition.ts` | wiring |

## A ordem dentro da transação é a implementação inteira

```ts
// 1. results dos budgets DESTE plano  ← precisa vir antes
// 2. delete do plano                  ← CASCATA leva budgets + árvore de custo
```

Invertendo, o `DELETE` do plano dispara o CASCADE, os `bgp_budgets` somem, e o subselect que descobre
os `budget_id` **não acha mais nada** — os results ficariam órfãos justamente por não terem FK. O
comentário no código registra isso: é a única coisa não-óbvia do arquivo.

`inArray` sobre os budgets **deste** plano, nunca delete global — travado pelo 2º caso do CA2.

## O que o schema já fazia (e o que não fazia)

| Dependente | Some sozinho? |
| :--- | :--- |
| `bgp_budgets` | ✅ FK CASCADE |
| `bgp_cost_centers → categories → subcategories` | ✅ FK CASCADE (cadeia) |
| **`bgp_budget_results`** | ❌ **sem FK nenhuma** → delete explícito |
| filhos (`parent_id`) | 🔒 FK **RESTRICT** — o banco recusa |

O RESTRICT é **backstop** de D2, não a solução: sozinho ele devolveria erro de FK → **500**, e o CA4
exige **409**. Quem decide é a guarda de domínio; o banco é a rede se a guarda falhar.

## Decisões de desenho

**A guarda não vive no agregado sozinha.** `BudgetPlan.remove(plan, children)` recebe os filhos: o
agregado só conhece os próprios orçamentos, e a árvore vive no repositório. Por isso o use case faz
`listChildren` **antes** — não é overhead, é a única fonte da resposta.

**`remove` não recebe `events` nem ator.** As outras escritas do port recebem; esta não. YAGNI: não
há evento de exclusão de plano no `BudgetPlansModuleEvent`, e não se audita `updatedBy` num registro
que deixa de existir. Difere do `removeBudget(plan, budgetId, events)`, que precisa persistir o
plano sobrevivente.

**Guarda pura, sem estado novo:** `Result<void, BudgetPlanError>`. Quem apaga é o repositório —
diferente das outras operações do agregado, que devolvem `{ plan }` porque produzem estado.

## Correção de rota no W1: a fixture do teste, não o código

O 2º caso do CA2 (*"não apaga dado de outro plano"*) falhou de primeira contra o MySQL real: os dois
`seed()` criavam plano com o **mesmo ano+programa** e colidiam na UNIQUE
`(year, program_ref, version_major, version_minor)`. Defeito do **teste**, não da implementação —
`seed` ganhou o ano como parâmetro (2026 e 2027). O erro real (`Failed query: insert into
bgp_budget_plans`) apareceu no log; não foi silenciado.

## Validação em MySQL real (8.4)

Container **descartável**. O `remove-plan-atomic` respeita `BUDGET_PLANS_DATABASE_URL` e rodou na
**3308**, sem tocar a infra dev. Já `drizzle-mysql.test.ts` (consumidor da suíte de contrato)
**hardcoda `127.0.0.1:3306`** — convenção do projeto —, então para ele foi preciso a receita
documentada: parar `core-api-mysql` → descartável na 3306 → validar → **restaurar** (feito;
`Up (healthy)` conferido). Nunca `pnpm test:integration:*` — destrói a infra dev.

```
19/19 verdes — suíte de contrato (drizzle) + remove-plan-atomic + remove-budget-atomic (#377, sem regressão)
  ok remove apaga o plano — findById devolve null e ele sai da listagem
  ok remove é escopado: apagar um plano não derruba o outro
  ok CA1/CA2: plano some — e leva orçamentos E resultados junto
  ok CA2: apagar um plano NÃO apaga dado de outro plano
```

Os 2 casos de `remove` da suíte rodam nos **dois** adapters (in-memory e drizzle) — é o que impede
o in-memory de mentir.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` → **4116 testes, fail 0, exit 0**
(baseline 4097 + 19 novos).

## Próxima wave

**W2** — `code-reviewer` (read-only).
