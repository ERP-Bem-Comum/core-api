# 🗂️ Taxonomia de categorização — owner e leitura (Centro → Categoria → Subcategoria)

> Contexto: issue **#341**. Hierarquia canônica de 3 níveis.

## Owner conceitual = Plano Orçamentário (`budget-plans`)

No front v2, os **Centros de Custo são criados no módulo Plano Orçamentário** (web-app S2.2). O `budget-plans` modela a árvore de 3 níveis com CRUD, **escopada por plano** (`bgp_cost_centers → bgp_categories[cost_center_id] → bgp_subcategories`, cada nó FK ao pai, sob `budget_plan_id`). É a **fonte de verdade** da estrutura.

## Como o `financial` (e demais módulos de referência) lê

O `financial` mantém uma **taxonomia de referência global** (`fin_cost_centers` + `fin_categories`), consumida como dado de rateio no lançamento/conciliação. A partir de **#341**, `fin_categories` carrega:

- `parent_id` (#147) — Categoria → **Subcategoria** (subcategoria = categoria com `parent_id`).
- `cost_center_id` (#341) — **Centro** → Categoria (soft ref a `fin_cost_centers`, sem FK — ADR-0014).

Com isso o front **cascateia Centro → Categoria → Subcategoria** só com o payload de `GET /financial/categories` (`costCenterId` + `parentId`) + `GET /financial/cost-centers`.

## Decisão de escopo (#341) e follow-up

- **Entregue (#341):** capacidade — `costCenterId` na categoria do financial + read/DTO + seed shape. O `budget-plans` **não** é tocado.
- **Divergência aceita por ora:** o `financial` tem sua taxonomia de referência **paralela** à do `budget-plans` (que é per-plano). Não há taxonomia canônica global única. A **unificação** (financial projetar/ler a taxonomia canônica do owner via public-api — ADR-0006) fica como **follow-up/ADR**, bloqueada hoje pelo escopo per-plano do `budget-plans` (falta o conceito de "taxonomia canônica global").
- **Seed real do legado** (portar a taxonomia via ACL — ADR-0048) = follow-up de **dado** (o shape já aceita `costCenterId?`; ver `reference-categories.ts`).
