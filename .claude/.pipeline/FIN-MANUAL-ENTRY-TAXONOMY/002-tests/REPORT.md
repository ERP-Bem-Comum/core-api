# FIN-MANUAL-ENTRY-TAXONOMY — W0 (RED)

> S2 do épico #502 · `tdd-strategist` · 2026-07-21. `src/` intocado. Reusa VOs `BudgetPlanRef` +
> `SubcategoryRef` da S1 (não recria). É a S1 aplicada ao **título manual** (`fin_manual_entries`).

## Testes (3 arquivos, nenhum existente tocado — CA8)

| Arquivo | Natureza | CAs |
| :-- | :-- | :-- |
| `tests/modules/financial/application/use-cases/manual-entry-taxonomy.use-cases.test.ts` | use-case + repo memory (puro) | CA2,3,4,5,6 |
| `tests/modules/financial/adapters/http/manual-entry-taxonomy.http.test.ts` | borda HTTP memory (puro) | CA2,4,5,6 |
| `tests/modules/financial/adapters/persistence/manual-entry-taxonomy.drizzle-mysql.test.ts` | estrutural (puro) + integração gateada | CA1,8 |

Integração registrada no grupo `financial`, **não executada** (#500). Só 3 arquivos (não 4 como a S1):
os VOs já existem/estão testados desde a S1 — reescrever seria duplicação.

## Prova do RED

| | tests | pass | fail | skipped |
| :-- | --: | --: | --: | --: |
| Antes | 4258 | **4239** | 0 | 19 |
| Depois | 4270 | **4239** | 12 | 19 |

`pass` estável (4239) — **regressão zero (CA8)**. 12 fails (5 use-case + 5 HTTP + 2 estrutural), pelo
motivo certo (reconferido no fio principal): campo/coluna/rehidratação inexistentes. Ex.: CA5 → registrar
com ref malformado devolve 201 hoje (Zod descarta) vs 400 esperado; estrutural →
`getTableColumns(finManualEntries)['budgetPlanRef']` = undefined.

## Assinatura para o W1

- **Schema** (`finManualEntries` ~795): `budgetPlanRef: varchar('budget_plan_ref',{length:36})` +
  `subcategoryRef: varchar('subcategory_ref',{length:36})` — nullable, sem FK, **sem índice** (título
  manual não tem projeção como a payable_view da S1).
- **Migration:** `db:generate` → `ADD COLUMN` × 2 (aditiva/INSTANT). ⚠️ **CHARSET/COLLATE manual:** refs
  são `utf8mb4_bin` (schema :794) — o SQL precisa carregar `CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`.
- **Domínio** (`reconciliation/types.ts` `ManualEntry`, `manual-entry.ts`): `budgetPlanRef`/`subcategoryRef`
  `string | null`; input opcional; montagem grava `?? null`.
- **Use case** (`record-manual-entry.ts`): input opcional; **rehidratar** com `BudgetPlanRef`/`SubcategoryRef`
  (espelha `save-document.ts`), `err` na borda; `RecordManualEntryError` ganha `FinancialRefError`; repasse
  spread-condicional.
- **Mapper** (`reconciliation.mapper.ts`): só o **`manualEntryToRow`** grava os dois; `toDomain` fica como
  está (`manualEntry: null` deliberado — não reidrata o boundary; YAGNI).
- **Borda** (`schemas.ts`): `manualEntryBodySchema` + `manualEntryResponseSchema` ganham os dois campos;
  `plugin.ts` passa e ecoa. O batch reusa o body.

## Armadilhas para o W1
1. Mapper: só `toRow` grava; **não** inventar reidratação no `toDomain` (regressão/YAGNI).
2. Borda: `z.object` descarta chave desconhecida → adicionar ao body **e** response.
3. CHARSET/COLLATE manual (`utf8mb4_bin`) nas 2 colunas da migration.
4. Migration puramente aditiva/INSTANT.
5. Ref opaco — sem FK, sem budget-plans, sem validar pertencimento (ADR-0014/CA7).
6. UUID v4 válido nos fixtures (não repetir o typo `u` da S1 — já conferidos v4).
7. Regressão zero — não editar os testes de manual entry existentes nem `refs.test.ts`.
8. `RecordManualEntryError` precisa de `FinancialRefError` senão o W3 não typechecka.

## Próximo passo
W1 (GREEN) — `drizzle-schema-author` + `ports-and-adapters`.
