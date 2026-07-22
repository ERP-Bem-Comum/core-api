# BDG-COST-STRUCTURE — escopo

> Issue **#316** (US2 · Plano Orçamentário, fatia 2/6). Módulo **`budget-plans`**. Size **M**.
> Spec: `specs/030-budget-plans-reproducao/spec.md` · **Gated pós-#246**. Portar de `../../ERP-BACKEND/budget-plans` + `budgets`.

## Escopo (in)

1. **Árvore de custos** `CostCenter (A PAGAR | A RECEBER) → Category → Subcategory`; a subcategoria carrega `launchType` (um dos 4 modelos — enum compartilhado com #317).
2. **Persistência** hierárquica (adjacency list em `bdg_cost_centers`/`bdg_categories`/`bdg_subcategories` ou tabela única auto-referenciada — decidir no W1 com `mysql-database-expert`); leitura via CTE recursiva ou montagem em app.
3. **Borda HTTP**: GET da árvore do plano + endpoints de escrita (add/edit/remove nó) respeitando editabilidade por status.

## Fora de escopo
- Cálculo de valores (#317). Aqui só a **estrutura**.

## Critérios de aceite
- **CA1** `GET` da estrutura → árvore CostCenter→Category→Subcategory com `launchType` e direcionamento (`A PAGAR`/`A RECEBER`) na folha.
- **CA2** editar nó em plano `Rascunho`/`Em Calibração` → persiste respeitando hierarquia; ciclo/nó órfão → `400`.
- **CA3** editar estrutura de plano `Aprovado` → bloqueado (`budget-plan-not-editable`).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (árvore CA1 + editabilidade CA2/CA3) | skill **`tdd-strategist`** |
| W1 | domínio da árvore + schema hierárquico + borda | skill **`ts-domain-modeler`** + skill **`drizzle-schema-author`** + agente **`mysql-database-expert`** (modelagem/CTE) |
| W2 | audit (schema + integridade referencial) | skill **`code-reviewer`** + agente **`drizzle-orm-expert`** |
| W3 | gate + `test:integration` | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`acdg-skills`**: modelagem de hierarquia (árvore) e integridade referencial (Ramakrishnan via `database-engineer`).
- **`mysql-database-expert`**: adjacency list vs. path enumeration; `WITH RECURSIVE` (permitido? checar ADR-0020).
- **`Explore`** sobre `../../ERP-BACKEND` (cost-center/category/subcategory + `launchType`).

## DoD
Gate W3 verde. Árvore de custos legível/editável por status. Fecha #316.
