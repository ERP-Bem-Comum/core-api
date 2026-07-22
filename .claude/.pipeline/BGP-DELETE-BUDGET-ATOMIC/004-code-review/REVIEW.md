# Code Review — BGP-DELETE-BUDGET-ATOMIC (#377) — Round 1

**Veredito:** APPROVED
**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-15
**Escopo revisado:** `budget-plan-repository.{drizzle,in-memory}.ts`, `delete-budget.ts`,
`domain/budget-plan/repository.ts`, `adapters/http/composition.ts`, `scripts/ci/test-integration.ts`,
`tests/.../delete-budget.test.ts` + `remove-budget-atomic.drizzle-mysql.test.ts`.

---

## Foco 1 — Atomicidade real (CRÍTICO) ✅

`removeBudget` (drizzle:229-240) executa `upsertPlanInTx(tx, plan, events)` + `tx.delete(schema.budgetResults).where(eq(...))`
**dentro de UMA** `db.transaction`. Ambos usam `tx`; **nenhum `await db...` fora da tx** no meio. Qualquer exceção
(upsert, CHECK do outbox, delete) → rollback total. Rollback provado pelo companion
`remove-budget-atomic.drizzle-mysql.test.ts:153` (evento malformado → `bgp_outbox_event_type_nonempty_chk` rejeita o
INSERT dentro da tx → budget e results permanecem, sem órfãos). A extração do helper `upsertPlanInTx` (:64-91) é
**linha-a-linha idêntica** ao corpo antigo do `save` (SELECT FOR UPDATE → UPDATE/INSERT → replace-all budgets →
`appendOutboxInTx`). SQL preservado.

## Foco 2 — Não-regressão do save genérico (CA3, CRÍTICO) ✅

`save` (drizzle:220-224) chama **só** `upsertPlanInTx` — não deleta `bgp_budget_results`. Só `removeBudget` apaga.
Guard-rail (CA3): um `save` via `addBudget` preserva os results. Create/scenery/calibration/addBudget/approve intactos.

## Foco 3 — Wiring in-memory ✅

`buildMemoryPools` (composition:174-190) cria `budgetResultRepo` uma vez, injeta em
`InMemoryBudgetPlanRepository(undefined, budgetResultRepo)`, retorna a mesma instância — sem duplicação/vazamento.
`removeBudget` in-memory faz `save` + (se ok) `deleteByBudgetId` no store co-localizado; ausente o store → no-op;
falha do save curto-circuita antes de apagar.

## Foco 4 — Port/use-case limpos ✅

`removeBudget` retorna `Result<void, BudgetPlanRepositoryError>` (mesmo union do `save`). `delete-budget.ts` removeu
a dep `budgetResultRepo` + o membro do union; 1 chamada `removeBudget`. Domínio/application puros; sem citação de
ticket no `src/`. `import type { BudgetId }`, `.ts` nas extensões.

---

## Achados

### 🔴 Blocker / 🟡 Major — nenhum.

### 🔵 Sugestões (não-bloqueiam)

1. `repository.ts:60-68` — o comentário do port cita infra concreta ("bgp_budget_results", "transação no adapter
   mysql"). Aceitável (Repository port, comentário de "porquê"), mas poderia ficar agnóstico de tabela.
2. `budget-plan-repository.in-memory.ts:99-108` — a atomicidade in-memory é best-effort (se `deleteByBudgetId`
   falhasse após o `save` mutar o Map, haveria estado parcial). Seguro porque o delete in-memory nunca falha; a
   garantia real é a tx do adapter mysql (CA4). Correto para um test double.

## O que está bom

- Extração do `upsertPlanInTx` sem mudar o SQL do `save` — um único ponto de verdade para o upsert.
- Cast `budgetId as unknown as string` segue o idioma já estabelecido no módulo — consistente.
- Testes de use-case com **fakes que registram estado** (não mocks), espiões `removeCalls`/`saveCalls` provando que
  o caminho novo não cai no `save` genérico.
- Integração registrada no runner atrás do gate `MYSQL_INTEGRATION`.

## Próximo passo

**APPROVED** → W3 (gate + validação MySQL real no x99, rollback provado por `remove-budget-atomic.drizzle-mysql.test.ts`).
