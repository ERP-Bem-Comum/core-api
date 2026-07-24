# FIN-MANUAL-ENTRY-TAXONOMY — W1 (GREEN)

> S2 do épico #502 · `drizzle-schema-author` + `ports-and-adapters` · 2026-07-21. `budgetPlanRef` +
> `subcategoryRef` no título manual (`ManualEntry`), espelhando os refs irmãos. Reusa os VOs da S1.

## Prova do GREEN

| | tests | pass | fail | skipped |
| :-- | --: | --: | --: | --: |
| Baseline (W0) | 4270 | 4239 | 12 | 19 |
| Depois (W1) | 4270 | **4251** | **0** | 19 |

12 fails → 0; `pass` 4239 → 4251 (+12). **Regressão zero (CA8):** 4251 − 12 = 4239. Gates conferidos no
fio principal: `typecheck` · `lint` · `format:check` verdes. Integração (#500) pulada.

## Arquivos por camada
- **Schema:** `finManualEntries` + `budget_plan_ref`/`subcategory_ref` (varchar 36, nullable, sem FK, sem índice).
- **Migration `0038_huge_clint_barton.sql`:** 2 `ADD COLUMN` **com `CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`** (byte-idênticos aos refs irmãos — evita illegal mix of collations em JOIN). Puramente aditiva/INSTANT — conferido.
- **Domínio:** `reconciliation/types.ts` (`ManualEntry`) + `manual-entry.ts` (input + montagem `?? null`).
- **Use case:** `record-manual-entry.ts` — rehidrata com `BudgetPlanRef`/`SubcategoryRef`, `err` na borda, `RecordManualEntryError` ganha `FinancialRefError`, repasse spread-condicional.
- **Mapper:** `reconciliation.mapper.ts` — só `manualEntryToRow` grava; `toDomain` intocado (boundary `null` deliberado).
- **Borda:** `manualEntryBodySchema` + `manualEntryResponseSchema` + `plugin.ts` (passa e ecoa).

## Achados/decisões (atenção do W2)
- **Spillover não enumerado no W0:** `reconciliation.ts` `buildDifferenceManualEntry` (a diferença classificada #141/#247) monta literal exaustivo de `ManualEntry` → precisou de `budgetPlanRef: null` + `subcategoryRef: null`. Correto: **diferença de conciliação não carrega taxonomia planejável** (como Estorno/Ajuste). Pego pelo typecheck, sem mudança de comportamento.
- **Nenhuma edição de teste** — os 3 arquivos do W0 rodaram como escritos (fixtures já com UUID v4 válido).
- **Batch:** `batchBodySchema` reusa o body (ganhou os campos), mas o handler do batch **não** repassa os dois refs — sem teste de batch na S2, opcionais → sem regressão. Registrado como possível follow-up.
- Ref opaco (ADR-0014/CA7): VO só `rehydrate`, sem FK/budget-plans/pertencimento.

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
