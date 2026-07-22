# BDG-PLAN-LIFECYCLE (US4) — research (2 Explores: legado + financial)

## A. Lifecycle no legado = ÁRVORE de planos + clonagem profunda (NÃO só transições)

Fonte: `../../ERP-BACKEND/src/modules/budget-plans/services/budget-plans.service.ts`.

- **Modelo:** plano é `@Tree("materialized-path")` com `parentId`/`children`. Cenário e calibração são
  **planos-filhos** (mesma tabela). O core-api hoje é **flat** (sem `parentId`) — portar exige +coluna + árvore.
- **scenery** (`:206-259`): cria filho `RASCUNHO`, versão `pai + 0.1`, `scenarioName` preenchido. Máx. 2 por
  plano `EM_CALIBRACAO`. Pai `APROVADO` não gera cenário.
- **start-calibration** (`:261-305`): cria filho `EM_CALIBRACAO`, versão `+1 inteiro`, só a partir de `APROVADO`.
  O aprovado NÃO é alterado.
- **aprovar** (`:155-204`): status→`APROVADO`; se for filho (`scenarioName`), **promove ao pai** (`copy`:186-204 —
  apaga conteúdo do pai e recopia do filho).
- **Clonagem profunda** (assíncrona por eventos): cost centers→categorias→subcategorias→budgets→budget_results,
  casando subcategoria **por NOME** (ids mudam ao clonar). ~3 serviços encadeados.
- **Bloqueio pós-aprovação:** guard `[RASCUNHO, EM_CALIBRACAO]` em toda escrita (o core já bloqueia APROVADO no cost-structure).

## B. Insights/Realizado — o CA3 do 000-request está MAL-ESCOPADO

- O `/budget-plans/:id/insights` do **legado é comparação ANO-A-ANO de totais planejados** (autocontido,
  lê `budget_plans.totalInCents` de anos anteriores) — **NÃO é Planejado × Realizado**.
- O verdadeiro **Planejado × Realizado é o módulo `reports`** do legado (`GET /reports/realized`) → mapeia para
  a **spec 032 (reports-module)**, não para o lifecycle. Cruza Planejado (budget_results) × Realizado (conciliação)
  × Provisionado (contratos), 5 queries + agregação em memória (com provável bug do `bankReconValue`).

### Realizado no financial do core-api (2º Explore)
- "CONCILIADO" = `Reconciled` (derivado de `reconciledSumCents >= valueCents`). Valor conciliado por título:
  `fin_reconciliation_items.reconciled_value_cents`. **Categoria** vive em `fin_payable_view.category_ref` /
  `fin_manual_entries.category_ref` — **NÃO** em `reconciliation_items`.
- **Nenhuma view/query materializa "realizado por categoria" hoje** — precisa criar no financial.
- Evento `PayableReconciled` tem `reconciledValueCents` mas **não** `categoryRef` (gap) e não é consumido por projeção.
- **Recomendação do Explore:** novo `financial/public-api/read.ts` (read port SÍNCRONO — padrão que budget-plans
  já usa p/ programs/partners; ACL adapter + wiring prontos em `composition.ts:183-209`). O financial ganha
  (i) query somando `reconciled_value_cents` por `category_ref` + (ii) o `read.ts`. Menor acoplamento prático.

## Conclusão: US4 é grande demais e mal-escopada — precisa de decisão de escopo (ver STATE/proposta)
