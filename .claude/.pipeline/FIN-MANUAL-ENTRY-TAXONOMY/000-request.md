# FIN-MANUAL-ENTRY-TAXONOMY — escopo (S2 do épico Taxonomia Planejável Unificada, #502)

> Size **M**. O **título manual** (lançamento na conciliação, `ManualEntry`) passa a carregar **Plano
> Orçamentário + Subcategoria** — hoje carrega só categoria/centro/programa. É o segundo lugar onde um
> título nasce; sem isso, o realizado manual entra torto no relatório. **1 módulo: financial.** Reusa o
> VO `SubcategoryRef` da S1 e o `BudgetPlanRef` existente.

## Princípio (P.O., 2026-07-21 — ver `.claude/.planning/EPIC-TAXONOMIA-PLANEJAVEL-UNIFICADA.md`)

A classificação mora no **título**. Existem **dois lugares onde um título nasce**: (a) lançar documento
(S1, fechada); (b) **título manual na conciliação** (esta S2). Quando não há título para conciliar, a
ferramenta oferece **lançar um título manual** — que precisa da mesma classificação completa do plano
para o relatório refletir certo. A classificação é **agnóstica de direção** — o `type` já cobre
`Payment` **e** `Receipt` (recebimento).

## Estado medido (2026-07-21, verificado)

`fin_manual_entries` (`schemas/mysql.ts:789-822`) carrega `supplier_ref`, `category_ref`,
`cost_center_ref`, `program_ref` — **sem `budget_plan_ref` e sem `subcategory_ref`**. O domínio
`ManualEntry` (`domain/reconciliation/manual-entry.ts:29-31,69-71`) e o use case
`record-manual-entry.ts:52-54,126-128` refletem o mesmo — só três refs. A borda é
`POST /financial/statement-transactions/:id/manual-entry` (`plugin.ts:1088`, `manualEntryBodySchema`).

## Escopo (in) — só financial

1. **Coluna `budget_plan_ref` + `subcategory_ref`** (`varchar(36)`, nullable, sem FK — ADR-0014) em
   `fin_manual_entries`. Migration **aditiva/INSTANT** (molde da 0037 da S1). ⚠️ CHARSET/COLLATE manual
   na migration (as refs são `utf8mb4_bin` — ver comentário do schema :794).
2. **Domínio `ManualEntry`** (`manual-entry.ts`): `budgetPlanRef`/`subcategoryRef` opcionais, ao lado
   dos irmãos, propagados no `record-manual-entry` (domínio) e nos pontos de projeção/rehydrate.
3. **Use case `record-manual-entry.ts`**: aceitar `budgetPlanRef?`/`subcategoryRef?`, rehydrate com os
   VOs (`BudgetPlanRef` existente + `SubcategoryRef` da S1), `err` na borda, passar ao domínio.
4. **Mapper da reconciliação** (`reconciliation.mapper.ts`): gravar/ler os dois refs no ramo
   `ManualEntry` (toRow/toDomain).
5. **Borda HTTP** (`manualEntryBodySchema` + `manualEntryResponseSchema`): campos `budgetPlanRef`/
   `subcategoryRef` **opcionais** no body; DTO de resposta os inclui.

## Fora de escopo

- Lançar documento (S1, **fechada** — reusa-se o VO daqui).
- Contrato (S3 = #343), guarda de exclusão (S4), leitura por subcategoria (S5), rota (S6).
- Validar pertencimento ao plano — ref **opaco** (ADR-0014), como na S1. VO valida só formato.
- Mudar a semântica de `Payment`/`Receipt` — só se acrescenta a classificação; as duas direções já existem.

## Critérios de aceite

- **CA1** `fin_manual_entries` ganha `budget_plan_ref` + `subcategory_ref` (nullable). Migration aditiva;
  regressão zero nos manual entries existentes (campos nascem nulos).
- **CA2** Registrar manual entry com `budgetPlanRef` + `subcategoryRef` → persiste; ler de volta → devolve
  os mesmos valores.
- **CA3** Os dois refs novos convivem com os três existentes (categoria/centro/programa).
- **CA4** Ambos **opcionais**: manual entry sem eles continua válido (nascem nulos) — back-compat.
- **CA5** VOs rejeitam formato inválido na borda (não-UUID → 400/erro kebab). Refs opacos.
- **CA6** Vale para `type='Payment'` **e** `type='Receipt'` — a classificação é agnóstica de direção.
- **CA7** ADR-0006/0014: refs opacos, sem FK, sem tocar `bgp_*`, sem chamar budget-plans.
- **CA8** Regressão zero: fluxos existentes de manual entry / conciliação inalterados.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — as 2 colunas, persistência+roundtrip, opcionalidade, os 2 tipos (Payment/Receipt) |
| W1 | `drizzle-schema-author` + `ports-and-adapters` | schema+migration + domínio + use case + mapper + borda |
| W2 | `code-reviewer` | audit read-only (ref opaco, espelhamento, back-compat, regressão) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — #500) |
