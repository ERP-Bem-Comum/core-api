# FIN-DOC-SUBCATEGORY-STAMP — escopo (S1 do épico Taxonomia Planejável Unificada, #502)

> Size **M**. O **carimbo da subcategoria** no documento financeiro: a folha da árvore do plano passa a
> ser gravada no título, para o Realizado × Planejado (REP-5) e a Análise de Pagamentos (REP-3) fecharem
> no grão fino. Núcleo do #502. **1 módulo: financial.**

## Princípio (P.O., 2026-07-21 — ver `.claude/.planning/EPIC-TAXONOMIA-PLANEJAVEL-UNIFICADA.md`)

A classificação mora no **título**. O documento já carrega Programa/Plano/Centro/Categoria como refs
do plano; falta a **Subcategoria** (a folha). O plano é o catálogo (owner budget-plans, ADR-0051; lido
via public-api, ADR-0006). Carimbo = **referência viva** (guarda `subcategory_ref`; a trilha e nomes
resolvem-se na leitura, do plano atual) — seguro pela invariante de id estável + soft-delete que
`bgp_budget_results` já exige.

## Estado medido (2026-07-21, verificado)

- `fin_documents` tem `program_ref`, `budget_plan_ref`, `cost_center_ref`, `category_ref` — **sem
  `subcategory_ref`** (`schemas/mysql.ts:88-91`).
- `budget_plan_ref` existe mas está **0 de 91** gravados (ADR-0051 §Evidência) — o create **aceita** o
  campo, a persistência é que não vinha acontecendo de forma consistente.
- `fin_payable_view` (projeção de leitura) espelha as mesmas refs (`schemas/mysql.ts:560-575`) — **sem
  subcategoria**.
- O front (Lançar documento) **já tem o dropdown Subcategoria**, validado e em produção — manda o valor,
  que hoje **não tem onde ser gravado**.

## Escopo (in) — só financial

1. **VO `SubcategoryRef`** em `financial/domain/shared/` (molde dos refs existentes — `budgetPlanRef`,
   `categoryRef`: branded, sem acoplamento ao domínio dono; ref opaco por formato UUID).
2. **Coluna `subcategory_ref`** (`varchar(36)`, nullable, soft ref sem FK — ADR-0014) em
   **`fin_documents`** e em **`fin_payable_view`**. Migration **aditiva/INSTANT**. Índice em
   `fin_payable_view.subcategory_ref` (molde dos irmãos, `:573-575`).
3. **Persistência:** `save-document`/`save-draft` (use cases) passam a aceitar e gravar
   `subcategoryRef`; o mapper lê/grava. **Garantir também `budgetPlanRef`** no mesmo caminho (fechar o
   0/91 para documentos novos).
4. **Borda HTTP:** campo `subcategoryRef` **opcional** no schema de create/update (aditivo — o create já
   aceita `budgetPlanRef`/`categoryRef` opcionais, `http/schemas.ts:106-109`). Zod. DTO de resposta
   inclui `subcategoryRef`.

## Fora de escopo

- **Título manual na conciliação** — é a S2 (`FIN-MANUAL-ENTRY-TAXONOMY`), reusa este VO.
- **Contrato** carregar subcategoria / refs — é a S3 (#343).
- **Guarda de exclusão** — é a S4 (budget-plans).
- **Leitura agrupar por subcategoria** — é a S5; aqui só se **grava**.
- **Validar que a `subcategory_ref` pertence ao plano** — decidir no W0 se entra aqui (checagem via
  budget-plans public-api) ou vira item da S5. Recomendação: **fora** — este ticket persiste um ref
  opaco (ADR-0014), coerente com como `category_ref`/`budget_plan_ref` já são tratados.
- Reclassificar os 91 legados (decisão nº 4 — ficam de fora).

## Critérios de aceite

- **CA1** `fin_documents` e `fin_payable_view` ganham `subcategory_ref` (nullable). Migration aditiva;
  **regressão zero** nos documentos existentes (campo nasce nulo).
- **CA2** Criar documento com `subcategoryRef` → persiste; ler de volta → devolve o mesmo valor.
- **CA3** Criar documento com `budgetPlanRef` → persiste (fecha o 0/91 para novos). Os dois refs
  convivem.
- **CA4** `subcategoryRef` **opcional**: documento sem ele continua válido (nasce nulo) — back-compat.
- **CA5** VO `SubcategoryRef` rejeita formato inválido na borda (não-UUID → erro de validação, slug
  kebab). Ref opaco: **não** resolve nome nem valida contra o plano (ADR-0014).
- **CA6** DTO de resposta do documento inclui `subcategoryRef`.
- **CA7** ADR-0006/0014: `financial` não importa domínio de budget-plans; `subcategory_ref` é ref
  opaco, sem FK física. Nenhuma tabela `bgp_*` tocada.
- **CA8** Regressão zero: fluxos existentes de documento (create/update/list/approve) inalterados.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — coluna, persistência dos dois refs, opcionalidade, VO, back-compat |
| W1 | `drizzle-schema-author` + `ports-and-adapters` | schema + migration + VO + use case + borda |
| W2 | `code-reviewer` | audit read-only (ADR-0014 ref opaco, back-compat, regressão) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — #500) |
