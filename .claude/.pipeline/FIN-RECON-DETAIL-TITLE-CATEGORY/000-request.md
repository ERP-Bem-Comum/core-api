# FIN-RECON-DETAIL-TITLE-CATEGORY — escopo (fatia 2: título real)

> Size **M**. Empilha sobre a **fatia 1** (`feat/recon-detail-manual-category` — campo `category` já no
> DTO). Agora: quando a conciliação é com **título real** (Individual/Multiple), a Categoria vem do
> **documento conciliado**, resolvida para nome.

## Causa-raiz
Fatia 1 resolve `category` só do lançamento manual (`manualEntry.categoryRef`). Para conciliação de título,
`manualEntry` é null → `category` vem null. O `categoryRef` do título está no documento, acessível via
`payableDocView.findByPayableIds([payableId])` (padrão do `export-reconciliation-nibo`).

## Escopo (in)
1. **Composition**: helper `resolveTitleCategoryRef(payableId)` → `payableDocView.findByPayableIds` →
   `categoryRef` (graceful null).
2. **Handler** do detalhe: `categoryRef = manualEntry?.categoryRef ?? (items[0] ? resolveTitleCategoryRef(payableId) : null)`;
   resolve nome via `resolveCategoryName` (fatia 1). Manual entry tem **precedência** (não regride).
3. Sem mudança de DTO/schema (campo `category` já existe da fatia 1).

## Fora de escopo
- Multiple: usa o `categoryRef` do **primeiro** título (o modal exibe um). Refino por-item = follow-up se preciso.

## Critérios de aceite
- **CA1** Conciliação de título cujo documento tem `categoryRef` → detalhe ecoa `category` = nome resolvido.
- **CA2** Título sem `categoryRef` → `category = null`.
- **CA3** (não-regressão fatia 1) Lançamento manual segue resolvendo pela `manualEntry.categoryRef`.
- **CA4** Regressão zero: `pnpm test` verde. (Resolução real via `payableDocView` Drizzle é #500-gated.)

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inject: detalhe de conciliação de título ecoa `category` |
| W1 | `fastify-server-expert` | resolveTitleCategoryRef + branch no handler |
| W2 | `code-reviewer` | audit — precedência manual, graceful null, sem regressão |
| W3 | `ts-quality-checker` | gate |
