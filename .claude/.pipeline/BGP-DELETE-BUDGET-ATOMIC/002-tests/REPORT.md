# W0 (RED) — BGP-DELETE-BUDGET-ATOMIC (#377)

**Skill:** `tdd-strategist` · **Wave:** W0 · **Outcome:** RED (intencional) · **Data:** 2026-07-15

## Objetivo do ticket

Tornar `deleteBudget` **atômico**: hoje faz `planRepo.save(plan, [])` + `budgetResultRepo.deleteByBudgetId(budgetId)`
em 2 awaits sequenciais (`delete-budget.ts:65-68`) → `bgp_budget_results` órfãos se o 2º falha. Solução: um método
atômico `planRepo.removeBudget(plan, budgetId, events)` que faz upsert-do-plano-sem-o-budget + delete-dos-results
na MESMA `db.transaction` (molde do `save` transacional, `budget-plan-repository.drizzle.ts:184-210`).

## Arquivos criados / alterados (só `tests/` e o manifesto — `src/` intocado, anti-padrão #3)

| Arquivo | Ação |
| :-- | :-- |
| `tests/modules/budget-plans/application/use-cases/delete-budget.test.ts` | **Reescrito/estendido** — unit do use-case com fakes que registram estado (CA1, CA2, CA3 + not-found) |
| `tests/modules/budget-plans/adapters/persistence/remove-budget-atomic.drizzle-mysql.test.ts` | **Novo** — atomicidade real em MySQL (CA4 feliz + rollback), gate `MYSQL_INTEGRATION` |
| `scripts/ci/test-integration.ts` | **Alterado** — registrado o arquivo novo na suíte `budget-plans` (evita órfão; precedente #316/#423/#440) |

## Mapa CA → teste

| CA | Teste | Camada | Estado W0 |
| :-- | :-- | :-- | :-- |
| **CA1** falha parcial reverte tudo | `delete-budget.test.ts` › "CA1 falha parcial reverte tudo" | unit (fake) | **RED** |
| **CA1/CA4** rollback (tx real) | `remove-budget-atomic.drizzle-mysql.test.ts` › "CA1/CA4 rollback" | integração MySQL | RED (roda em W3/x99) |
| **CA2** caminho feliz | `delete-budget.test.ts` › "CA2 caminho feliz" | unit (fake) | **RED** |
| **CA3** não-regressão (save genérico não deleta results) | `delete-budget.test.ts` › "CA3 nao-regressao" | unit (in-memory real) | **GREEN** (guard-rail) |
| **CA4** atomicidade caminho feliz | `remove-budget-atomic.drizzle-mysql.test.ts` › "CA4 caminho feliz" | integração MySQL | RED (roda em W3/x99) |

> Decisão TDD: CA1/CA2/CA3 no nível do **use-case** com FAKES que registram estado (não mocks) — robusto ao
> wiring que o W1 escolher para o adapter in-memory. O fake do `BudgetPlanRepository` envelopa o
> `InMemoryBudgetPlanRepository` real + um `InMemoryBudgetResultRepository` co-localizado, e expõe `removeBudget`
> atômico controlável (`failRemove` → retorna erro SEM mutar nada). A atomicidade REAL da transação (rollback)
> fica no companion de integração (CA4), forçando a falha mid-tx via evento malformado (`event_type` vazio →
> CHECK `bgp_outbox_event_type_nonempty_chk` rejeita o INSERT do outbox dentro da tx — técnica dos
> `*-outbox-atomic.drizzle-mysql.test.ts` do financial).

## Saída REAL do RED

### Arquivos afetados isolados (sem `MYSQL_INTEGRATION` — integração pula limpo)

```
▶ deleteBudget (use case) — BGP-DELETE-BUDGET-ATOMIC #377
  ✖ CA2 caminho feliz: delega ao removeBudget e some com budget + results juntos
  ✖ CA1 falha parcial reverte tudo: removeBudget falha -> budget e results permanecem
  ✔ CA3 nao-regressao: o save generico do plano NAO deleta results (outros use-cases intactos)
  ✔ budget inexistente -> budget-not-found (retorna antes de persistir)
ℹ tests 5 · pass 3 · fail 2 · skipped 0
```

### `pnpm test` completo

```
ℹ tests 4035 · suites 1148 · pass 4014 · fail 2 · skipped 19 · duration_ms 80202.96

✖ delete-budget.test.ts:131 CA2 caminho feliz
  TypeError: Cannot read properties of undefined (reading 'deleteByBudgetId') at delete-budget.ts:68:34
✖ delete-budget.test.ts:154 CA1 falha parcial reverte tudo
  TypeError: Cannot read properties of undefined (reading 'deleteByBudgetId') at delete-budget.ts:68:34
```

**RED intencional:** exatamente 2 falhas (CA1 + CA2). A falha em `delete-budget.ts:68` ocorre porque a nova forma
de deps `{ planRepo, clock }` deixa de injetar `budgetResultRepo`, e o use-case ainda usa os 2 awaits em vez do
`removeBudget` atômico. Flipam para GREEN quando o W1 trocar os 2 awaits por `deps.planRepo.removeBudget(...)`.
**Vermelho alheio: nenhum.** Os 19 skips são integração pré-existente gated por `MYSQL_INTEGRATION`. `typecheck`
vermelho no W0 é esperado (API ausente).

## Assinatura EXATA pinada para o W1

Adicionar ao port `BudgetPlanRepository` (`domain/budget-plan/repository.ts`; exige
`import type { BudgetId } from '../shared/budget-id.ts'`):

```ts
removeBudget: (
  plan: BudgetPlan,
  budgetId: BudgetId,
  events: readonly BudgetPlansModuleEvent[],
) => Promise<Result<void, BudgetPlanRepositoryError>>;
```

Semântica: `plan` = plano JÁ sem o budget (use-case aplica `BudgetPlan.removeBudget` antes); `budgetId` = os
`bgp_budget_results` a apagar; `events` na mesma tx (use-case passa `[]`); retorno = mesma união de erro do `save`
(via `safe()`). **Atomicidade:** sucesso → plano-sem-budget + results apagados juntos; falha → rollback total.

### Mudanças que o W1 fará em `src/`

1. `domain/budget-plan/repository.ts` — `removeBudget` no port + import `BudgetId`.
2. `adapters/persistence/repos/budget-plan-repository.drizzle.ts` — `removeBudget` numa `db.transaction` (reusa a
   lógica do `save`: upsert plano + replace-all budgets + `appendOutboxInTx`) + `tx.delete(schema.budgetResults).where(eq(budgetId))`.
3. `adapters/persistence/repos/budget-plan-repository.in-memory.ts` — `removeBudget` (save + apaga results;
   alcançar o store de results — decisão do W1 mantendo o contrato).
4. `application/use-cases/delete-budget.ts` — trocar linhas 65-68 por
   `return deps.planRepo.removeBudget(removed.value.plan, budgetId.value, []);`; remover `budgetResultRepo` de
   `DeleteBudgetDeps` e `BudgetResultRepositoryError` de `DeleteBudgetError`.
5. `adapters/http/composition.ts:277` — `deleteBudget({ planRepo, clock })` (dropar `budgetResultRepo`).
