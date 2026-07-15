# BGP-DELETE-BUDGET-ATOMIC — escopo (#377)

> `deleteBudget` remove o orçamento do plano e seus resultados em **dois `await` sequenciais** de repos
> distintos, sem atomicidade → resultados órfãos se o 2º falha. Torná-lo **atômico via transação única**.
> Size **M**. Branch `feat/377-330-budget-plans-hardening`. Prioridade da P.O. (Bloco 1 — Orçamento).

## Problema (#377)

`delete-budget.ts` hoje:
```ts
const saved = await deps.planRepo.save(removed.value.plan, []);   // 1. remove o budget do agregado
if (!saved.ok) return saved;
return deps.budgetResultRepo.deleteByBudgetId(budgetId.value);     // 2. apaga bgp_budget_results
```
Se (2) falha após (1) commitar, os `bgp_budget_results` ficam **órfãos** (budget já não existe). Registrado
como "aceitável para MVP" (DESIGN-DECISIONS.md D2), mas é dívida a corrigir.

## Decisão de arquitetura — (a) transação única (não job de limpeza, não aceitar)

**Escolhida (a) — atomicidade real.** Fundamento verificado no código:
- Os dois repos (`createDrizzleBudgetPlanRepository` e `createDrizzleBudgetResultRepository`) recebem o
  **mesmo `handle.db`** (mesmo database `core`, prefixo `bgp_*`) — `composition.ts`. Compartilham conexão.
- O `save` do plano **já roda em `db.transaction`** (`budget-plan-repository.drizzle.ts:186`): upsert do
  plano + replace-all dos budgets + outbox, tudo atômico. Adicionar o `delete` dos `bgp_budget_results`
  **na MESMA tx** é natural — ambas as tabelas no mesmo db.
- Precedente de tx no módulo: `budget-plan-repository.drizzle.ts:186`, `cost-structure-repository.drizzle.ts:118,148`.

**Rejeitadas:** (b) job de reconciliação de órfãos = worker novo, desproporcional; (c) aceitar
formalmente = deixa a dívida. A tx única é o certo e o mais barato aqui (mesmo db, tx já existe).

## Escopo (in)

1. **Port `BudgetPlanRepository`** (`domain/budget-plan/repository.ts`) — método novo
   `removeBudget(plan: BudgetPlan, budgetId: BudgetId, events): Promise<Result<void, E>>` que persiste o
   plano-sem-o-budget **E** apaga os `bgp_budget_results` daquele `budgetId` **atomicamente**. (Alternativa
   de forma: um port de unit-of-work dedicado — o W1 escolhe seguindo o precedente do módulo; o essencial é
   1 método atômico, não 2 awaits.)
2. **Drizzle** (`budget-plan-repository.drizzle.ts`) — `removeBudget` numa `db.transaction`: upsert do plano
   (reusa a lógica do `save`) + `tx.delete(schema.budgetResults).where(eq(budgetId))` na mesma tx. Se
   qualquer passo falha, a tx faz rollback (nada órfão, nada removido).
3. **In-memory** (`budget-plan-repository.in-memory.ts`) — `removeBudget` que faz save + delete nos dois
   stores in-memory (o InMemoryBudgetResultRepository store precisa ser alcançável; se hoje são stores
   isolados, unir via o mesmo Map ou expor o delete — o W1 resolve mantendo o contrato).
4. **`delete-budget.ts`** — trocar os 2 awaits (`planRepo.save` + `budgetResultRepo.deleteByBudgetId`) por
   **1** `planRepo.removeBudget(removed.value.plan, budgetId.value, [])`. Remover a dep `budgetResultRepo`
   do use-case se ela ficar sem uso.
5. Composition — ajustar wiring se o método novo mudar a assinatura das deps.

## Fora de escopo

- Job de reconciliação de órfãos (rejeitado). FK física entre `bgp_budget_results` e `bgp_budgets`
  (proibida por D1 — o pai sofre replace-all). Tocar outros use-cases que salvam o plano.

## Critérios de aceite (Dado/Quando/Então)

- **CA1 — Falha parcial reverte tudo:** Dado um orçamento com N resultados, Quando `deleteBudget` roda e o
  delete dos resultados falha (ou o save falha) **dentro** da operação, Então **nada** é commitado — o
  budget continua no plano E os resultados continuam (estado consistente, sem órfãos). Provado com um repo
  cujo delete lança dentro da tx.
- **CA2 — Caminho feliz:** Dado o fluxo normal, Quando `deleteBudget` roda, Então budget e resultados somem
  **juntos** (mantém o comportamento de `delete-budget.test.ts`).
- **CA3 — Não-regressão:** os outros use-cases que salvam o plano (create/scenery/calibration) intactos; o
  `save` genérico do plano **não** passa a deletar results (só o `removeBudget` faz).
- **CA4 — Atomicidade validada em MySQL real:** o delete dos `bgp_budget_results` e o upsert do plano
  ocorrem na mesma transação; falha parcial → rollback completo (nada persiste). Verificado no x99/OrbStack.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — teste de falha parcial (repo/result que lança na tx → nada persiste) + caminho feliz |
| W1 | `drizzle-orm-expert` (tx) + `ports-and-adapters` (método/port) | `removeBudget` atômico no port/drizzle/in-memory; use-case usa 1 chamada |
| W2 | `code-reviewer` | audit read-only (atomicidade real, não-regressão do save genérico) |
| W3 | `ts-quality-checker` | gate + integração MySQL (rollback em falha parcial), caminho não-destrutivo |

## DoD

Gate W3 verde + CA1–CA4 + delete atômico (rollback provado) + save genérico intacto + validação MySQL real.
Fecha #377.
