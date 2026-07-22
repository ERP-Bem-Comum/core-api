# W1 (implementação até GREEN) — BGP-DELETE-BUDGET-ATOMIC (#377)

**Par:** `drizzle-orm-expert` (transação) + `ports-and-adapters` · **Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-07-15

## Objetivo

Fazer os 2 RED do W0 (CA1/CA2) ficarem GREEN tornando `deleteBudget` **atômico**: trocar os 2 awaits
(`planRepo.save` + `budgetResultRepo.deleteByBudgetId`) por **1** método `planRepo.removeBudget(plan, budgetId, events)`
que persiste o plano-sem-o-budget E apaga os `bgp_budget_results` daquele budget na MESMA operação (mesma
`db.transaction` no mysql; mesmo tick no in-memory). Sem migration.

## Arquivos alterados (`src/`) — 5 pontos do W0

| Arquivo | Mudança |
| :-- | :-- |
| `domain/budget-plan/repository.ts` | `import type { BudgetId }` + método `removeBudget(plan, budgetId, events): Promise<Result<void, BudgetPlanRepositoryError>>` no port (assinatura EXATA do W0). |
| `adapters/persistence/repos/budget-plan-repository.drizzle.ts` | Extraído helper `upsertPlanInTx(tx, plan, events)` (a lógica do `save`: SELECT FOR UPDATE + UPDATE/INSERT do plano + replace-all budgets + `appendOutboxInTx`); `save` agora só o chama; **novo** `removeBudget` numa `db.transaction` = `upsertPlanInTx` + `tx.delete(schema.budgetResults).where(eq(budgetId))` na MESMA tx, envolto por `safe('removeBudget', ...)`. Tipos `Db`/`Tx` (molde `cost-structure-repository.drizzle.ts`). |
| `adapters/persistence/repos/budget-plan-repository.in-memory.ts` | `save` extraído p/ função reusável; **novo** `removeBudget` = `save(plan, events)` + (se ok) apaga os results daquele `budgetId`. |
| `application/use-cases/delete-budget.ts` | Removida a dep `budgetResultRepo` de `DeleteBudgetDeps` + `BudgetResultRepositoryError` de `DeleteBudgetError`. Linhas 65-68 → `return deps.planRepo.removeBudget(removed.value.plan, budgetId.value, []);`. Comentário atualizado (atomicidade, não mais "aceitável órfão" da D2). |
| `adapters/http/composition.ts` | `deleteBudget({ planRepo, clock })`; `buildMemoryPools` cria o `budgetResultRepo` ANTES e injeta em `InMemoryBudgetPlanRepository(undefined, budgetResultRepo)` (compartilha o store). |

Ajuste no teste do W0 (não em `src/`): o fake `makeAtomicFakeRepo` devolvia `deleteByBudgetId` (union de erro
`BudgetResultRepositoryError`) onde a assinatura exige `BudgetPlanRepositoryError` → TS2322 assim que a API passou
a existir. Corrigido mapeando o erro (`deleted.ok ? deleted : err('budget-plan-repo-unavailable')`), preservando o
comportamento (store in-memory nunca falha). Sem isso o typecheck ficaria vermelho — regressão zero.

## Como resolvi o in-memory (store de results)

`InMemoryBudgetPlanRepository` ganhou 2º parâmetro **opcional** `budgetResultRepo?`. O `removeBudget` in-memory
persiste o plano (via `save` reusado) e, se ok, chama `budgetResultRepo.deleteByBudgetId(budgetId)` no MESMO store
que a composição lê — espelhando a tx única do mysql. Ausente o store, o delete é no-op. No `buildMemoryPools`, o
`budgetResultRepo` é criado ANTES do `planRepo` e injetado — os dois compartilham a mesma instância (antes eram
isoladas). O contrato do port não muda (o wiring é do adapter/composition).

## Invariantes atendidas

- **Atomicidade real (CA1/CA4):** drizzle — `upsertPlanInTx` + `tx.delete(budgetResults)` dentro de UMA
  `db.transaction`; qualquer exceção (upsert, CHECK do outbox, delete) → rollback total. In-memory — save + delete
  no mesmo tick; falha do save curto-circuita antes de apagar results.
- **Não-regressão do save genérico (CA3):** o `save` (create/scenery/calibration/addBudget/approve) chama SÓ
  `upsertPlanInTx` — **não** deleta `bgp_budget_results`. Só `removeBudget` apaga.
- Domínio/application puros; `Result` na borda; `import type`/`.ts`; sem citar ticket; comentário só de "porquê".

## Saída REAL

```
$ node --test … delete-budget.test.ts
  ✔ CA2 caminho feliz · ✔ CA1 falha parcial reverte tudo · ✔ CA3 nao-regressao · ✔ budget-not-found
  ℹ tests 4 · pass 4 · fail 0

$ pnpm run typecheck   → tsc --noEmit (sem saída)
$ pnpm run lint        → eslint . (sem saída)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4035 · pass 4016 · fail 0 · skipped 19
```

**Delta vs W0:** `pass 4014→4016 · fail 2→0` — os 2 RED (CA1+CA2) viraram GREEN, nada mais mudou. Os 19 skips
são integração MySQL pré-existente (gate `MYSQL_INTEGRATION`), alheios. Vermelho alheio: nenhum.

## O que o W2 deve auditar

1. **Atomicidade real:** `removeBudget` no drizzle usa UMA `db.transaction` (`upsertPlanInTx` + `tx.delete(budgetResults)`),
   sem `await db...` fora da tx. Rollback provado no W3/x99 (`remove-budget-atomic.drizzle-mysql.test.ts`, gate).
2. **Save genérico intacto (CA3):** `save` = só `upsertPlanInTx`, NÃO toca `bgp_budget_results`. A extração do
   helper não mudou o SQL do `save`.
3. **Port limpo:** `removeBudget` retorna `Result<void, BudgetPlanRepositoryError>`; o use-case não conhece mais
   `BudgetResultRepository`.
4. **Wiring in-memory:** store de results compartilhado no `buildMemoryPools` não vaza p/ outros use-cases nem
   duplica instância; contrato do port mantido (2º param opcional; no-op se ausente).
