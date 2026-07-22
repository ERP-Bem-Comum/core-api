# BGP-INSIGHTS-REALIZED — W1 (impl até GREEN) REPORT (#416)

## Resumo

Os 4 testes RED do W0 ficaram GREEN, mínimo (YAGNI), sem migration. Arquitetura (B): reader novo 100% no
`financial/public-api` (JOIN 3-hop intra-financial), consumido pelo `budget-plans` via port/ACL. Aditivo:
Planejado inalterado.

## Arquivos criados

- `src/modules/financial/public-api/realized-by-plan-projection.ts` — reader boot-scoped
  `openRealizedByPlanReader({ connectionString }) → Result<RealizedByPlanReader, string>` com
  `RealizedByPlanReader = { getByPlans(refs) → Promise<Result<ReadonlyMap<string,number>, string>>; close() }`.
  Molde exato do `payment-position-projection.ts`.
- `src/modules/budget-plans/application/ports/realized-by-plan-reader.ts` — port `type` puro;
  `RealizedByPlanReadError = 'realized-by-plan-read-unavailable'`.
- `src/modules/budget-plans/adapters/persistence/realized-by-plan-reader.financial.ts` — ACL (recebe
  `getByPlans` já ligada, nunca connection-string; molde `suppliers-without-contract-read.financial.ts`).
- `src/modules/budget-plans/adapters/persistence/realized-by-plan-reader.in-memory.ts` — fake, seed
  `Record<ref, cents>`; default `{}` ⇒ Map vazio ⇒ 0.

## Arquivos alterados

- `financial/public-api/index.ts` — barrel: `openRealizedByPlanReader` + type `RealizedByPlanReader`.
- `budget-plans/application/use-cases/get-budget-plan-insights.ts` — dep `realizedReader`;
  `YearTotal += realizedInCents`; `BudgetPlanInsights += networksCount`; erro `+= RealizedByPlanReadError`.
  `totalInCents` (Planejado) intacto. Comentário de fronteira `:11-12` atualizado.
- `budget-plans/adapters/http/schemas.ts` — `yearTotalSchema += realizedInCents: z.number().int()`;
  `budgetPlanInsightsResponseSchema += networksCount: z.number().int().nonnegative()`.
- `budget-plans/adapters/http/composition.ts` — injeção do `realizedReader` (memory vs mysql).
- `budget-plans/adapters/http/plugin.ts` — `'realized-by-plan-read-unavailable' → 503` (fail-closed);
  rota `/insights` devolve `result.value` direto (campos novos fluem).
- `tests/.../get-budget-plan-insights.test.ts` — **fix de regressão-zero (lint):** fake `async (_refs) => ok(...)`
  sem `await` violava `@typescript-eslint/require-await` (não relaxado em `tests/**`) → trocado por
  `(_refs) => Promise.resolve(ok(...))`. Sem mudar contrato nem símbolos pinados.

## SQL do reader (JOIN 3-hop intra-financial)

```sql
SELECT fin_documents.budget_plan_ref AS ref,
       SUM(fin_reconciliation_items.reconciled_value_cents) AS realizedCents
FROM fin_reconciliation_items
INNER JOIN fin_reconciliations
       ON fin_reconciliations.id = fin_reconciliation_items.reconciliation_id
      AND fin_reconciliations.status = 'Active'          -- exclui Undone (CA2)
INNER JOIN fin_payables   ON fin_payables.id = fin_reconciliation_items.payable_id
INNER JOIN fin_documents  ON fin_documents.id = fin_payables.document_id
WHERE fin_documents.budget_plan_ref IN (:refs)           -- inArray; batch anti-N+1 (CA5)
GROUP BY fin_documents.budget_plan_ref;
```

- Parciais entram: soma `reconciled_value_cents` (valor conciliado), não `fin_payables.value` (CA2).
- `refs` vazio ⇒ Map vazio SEM tocar o banco (evita `IN ()`). mysql2 SUM string → `Number()`. Ref sem
  conciliação Active ausente do Map (consumidor trata como 0). ADR-0020 §permitidas: INNER JOIN, IN,
  SUM/GROUP BY. Zero JOIN `bgp_*` × `fin_*`.

## Composição memory vs mysql

- **memory:** `InMemoryRealizedByPlanReader()` (Map vazio ⇒ Realizado 0).
- **mysql:** `openRealizedByPlanReader({ connectionString })` boot-scoped + `RealizedByPlanReadFromFinancial`;
  `close()` no `shutdown`. **Mesma connection string** do `core` (ADR-0014, isolamento por prefixo) —
  idêntico a `buildProgramsReadPort`/`buildPartnersReadPort`. Nenhuma env nova.

## Saída REAL dos gates

```
$ pnpm run typecheck  → tsc --noEmit (sem erros)
$ pnpm test           → tests 4023 · pass 4004 · fail 0 · skipped 19
  (baseline W0: pass 4000 · fail 4 → os 4 RED agora GREEN)
  dirigido (3 arquivos): 6/6; [financial:realized-by-plan] pulando integração (skip limpo)
$ pnpm run lint       → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
```

Integração MySQL real do reader (CA1/CA2/CA5) é do W3 — aqui só skip limpo. Zero vermelho alheio.

## O que o W2 deve auditar

1. **JOIN intra-financial:** reader 100% no `financial`; budget-plans só consome via port/ACL. **Zero JOIN
   `bgp_*` × `fin_*`**. `status='Active'` no ON (exclui Undone); SUM sobre `reconciled_value_cents` (parciais).
2. **Planejado inalterado (CA4):** `totalInCents` de current/previousYears não mudou; só campos novos.
3. **Pool boot-scoped:** aberto 1× no boot da composição mysql, `close()` no shutdown; nunca por request;
   `applyMigrations:false`.
4. **ACL fail-closed:** erro do financial → `'realized-by-plan-read-unavailable'` → 503.
5. **Correlação `budget_plan_ref = String(plan.id)`** + batch único `getByPlans` (anti-N+1); `?? 0` p/ ausente.
