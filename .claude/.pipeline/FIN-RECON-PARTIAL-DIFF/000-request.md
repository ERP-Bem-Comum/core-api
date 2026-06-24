# FIN-RECON-PARTIAL-DIFF — conciliação parcial + lançamento da diferença (#141/#247)

**Issues:** [#141](https://github.com/ERP-Bem-Comum/core-api/issues/141) (sp:5, L) + delta [#247](https://github.com/ERP-Bem-Comum/core-api/issues/247) · **Milestone:** Go-Live Op-2 · **Branch:** `feat/141-recon-partial-diff`
**🎯 Goal:** completar o tratamento de diferença na conciliação — **pagamento parcial** (saldo aberto do título) + **lançamento classificado** da diferença.

## Estado atual (já entregue na 025)
O VO `Difference {valueCents, treatment}` (`Interest|Penalty|Fee|Discount|Partial`) e a **classificação** já existem (`types.ts:50`; ticket `FIN-RECON-DIFF-VERIFY`; caracterizado em `tests/.../reconciliation/difference-diagnosis.test.ts`). Falta o **delta #247**: parcial (saldo aberto) + lançamento classificado.

## Decisões de modelagem (CLARIFY resolvido — ts-domain-modeler + database-engineer)
- **(a) Saldo parcial:** `fin_reconciliation_items.reconciledValueCents` passa a gravar o **valor REAL conciliado** (não mais sempre `payable.valueCents`). O status do título é **derivado** da soma conciliada (reconciliações ativas): soma `>= payable.valueCents` → `Reconciled`; soma `> 0` e `< valueCents` → **novo status `PartiallyReconciled`**. Saldo aberto = `valueCents − Σ conciliado`. **Migration:** adicionar `'PartiallyReconciled'` ao `fin_payables_status_chk` (atualizar o `check()` no schema drizzle + `pnpm run db:generate:financial`).
- **(b) Lançamento da diferença:** **reusar `ManualEntry`** (já tem `categoryRef`/`costCenterRef`/observação). Diferença classificada (`Interest|Penalty|Fee|Discount`) → cria um `ManualEntry` vinculado à conciliação (categoria/centro de custo/observação informados no confirm). DRY/YAGNI — sem agregado novo.

## Escopo técnico
- **Domínio `reconciliation.ts`:** `reconciledValueCents` por item = valor alocado real (input do use-case), não `payable.valueCents`. Manter invariante R3 (`Σ itens + difference.valueCents === transação`). Validação de **sinal** da diferença (CA5): `Discount` exige `valueCents < 0`; `Interest|Penalty|Fee` exigem `valueCents > 0` → senão `err('difference-sign-invalid')`.
- **Domínio payable:** status `PartiallyReconciled`; transição/derivação a partir da soma conciliada; helper de saldo aberto. Discriminated union + switch exausto.
- **Application:** `confirmReconciliation` aceita alocação parcial por título + classificação da diferença (`categoryRef`/`costCenterRef`/`note`); orquestra: cria `ManualEntry` (quando classificada) + atualiza status do(s) título(s) (Reconciled vs PartiallyReconciled). `undoReconciliation` reverte o status corretamente (PartiallyReconciled/Reconciled → Paid) e o ManualEntry vinculado.
- **Persistência:** `fin_reconciliation_items.reconciled_value_cents` parcial; vínculo ManualEntry↔conciliação; UPDATE status do payable; **migration** do CHECK. Atomicidade na tx existente (ADR-0015, fin_outbox se aplicável).
- **Borda HTTP:** `POST /reconciliations` aceita o tratamento da diferença (classificação + parcial) — schema Zod + DTO.

## ✅ Critérios de aceite (merge #141 + #247)
- **CA1** — diferença = 0 → conciliação cheia (comportamento atual preservado).
- **CA2** — diferença ≠ 0 **sem** classificação → bloqueia (slug claro).
- **CA3** — diferença classificada (juros/multa/desconto/tarifa) + centro de custo/observação → gera **ManualEntry** vinculado; a diferença "fecha" o vínculo.
- **CA4** — pagamento parcial (ex.: título 8000, extrato 6000, `Partial`) → `reconciledValueCents = 6000`, título fica **`PartiallyReconciled`** com 2000 abertos (não `Reconciled`).
- **CA5** — sinal incoerente (`Discount` com `valueCents > 0`) → 422 `difference-sign-invalid`.
- **CA6** — conciliar o saldo restante → título vai a `Reconciled`; soma dos parciais = valor original (idempotente).
- Atualizar a suíte de caracterização `difference-diagnosis.test.ts` para o novo comportamento.

## Disciplina
Domínio puro (Result, sem throw/class, switch exausto); ESM `.ts`+`import type`; `exactOptionalPropertyTypes`; ADR-0020 (CHECK manual; sem ENUM). Migration via `db:generate:financial` (não exige DB no generate). Gate W3 verde; sem regressão. Avaliar ADR se mudar regra de domínio relevante (novo status é evolução, provavelmente sem ADR).
