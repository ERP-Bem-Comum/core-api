# FIN-REFERENCE-HIERARCHY-3LEVEL — escopo

> Issue **#341** — `Hierarquia canônica Centro de Custo → Categoria → Subcategoria (3 níveis, legado)`. Módulo **`financial`/reference**. Size **L**. **Enabler cross-módulo**.

## Contexto
`FIN-CATEGORY-HIERARCHY` (#147) entregou apenas **2 níveis** (`parentId` categoria→subcategoria) como capacidade, sem taxonomia. A #341 pede a **hierarquia canônica de 3 níveis** com **Centro de Custo no topo** (Centro → Categoria → Subcategoria), semeada a partir do **legado**, servindo de referência para todos os módulos (budget-plans, financial).

## Escopo (in)
1. Modelar **Centro de Custo** como nível-raiz da hierarquia de referência (ou relacionar categoria a Centro), 3 níveis canônicos.
2. Schema + migration (prefixo de reference), respeitando ADR-0018/0020 (varchar(36) UUID, sem ENUM, FK auto-referente/nível).
3. **Seed do legado**: portar a taxonomia real (ETL/ACL — traduzir enums divergentes, não relaxar o VO).
4. Expor leitura da árvore de 3 níveis via read (endpoint de reference) para consumo cross-módulo (public-api, ADR-0006).

## Fora de escopo
- Regras de orçamento que consomem a hierarquia (só a referência canônica aqui).
- Edição de taxonomia pela UI (seed/dado, não código).

## Critérios de aceite
- **CA1** Hierarquia de 3 níveis (Centro → Categoria → Subcategoria) modelada e persistida; nível-raiz = Centro de Custo.
- **CA2** Seed do legado carrega a taxonomia real (validado no x99); enums divergentes traduzidos via ACL.
- **CA3** Leitura da árvore exposta (read-model) consumível por outros módulos só via public-api.
- **CA4** Back-compat: categorias 2-níveis pré-existentes continuam coerentes.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (árvore 3 níveis + seed legado) | skill **`tdd-strategist`** |
| W1 | schema + migration + seed + read | skill **`drizzle-schema-author`** + skill **`database-engineer`** + skill **`modular-monolith`** (fronteira/public-api) |
| W2 | audit (schema + ACL do seed) | skill **`code-reviewer`** + agente **`mysql-database-expert`** |
| W3 | gate + migration no MySQL real (x99) | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`mysql-database-expert`**: modelagem da árvore (adjacency list vs path), índice, `ALTER` válido no MySQL 8.4 (gotcha widening VARCHAR sem ALGORITHM).
- **`acdg-skills`** (MCP): hierarquia de referência / Bounded Context (Evans p.226 ACL).
- **`Explore`** sobre `../../ERP-BACKEND` (taxonomia legada) + `FIN-CATEGORY-HIERARCHY` (#147) entregue.

## DoD
Gate W3 verde. Árvore canônica de 3 níveis + seed do legado validado no x99. Fecha #341 e habilita frentes de orçamento.
