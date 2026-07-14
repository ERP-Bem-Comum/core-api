# FIN-REFERENCE-HIERARCHY-3LEVEL — escopo (#341)

> Issue **#341** — hierarquia canônica Centro de Custo → Categoria → Subcategoria (3 níveis) no reference do `financial`. Módulo **`financial`**. Size **M** (reduzido de L após decisão de escopo).

## Decisão de ownership (Gabriel, 2026-07-13)

Mapa do estado real (via Explore): o `budget-plans` já owna a árvore 3-níveis (`bgp_cost_centers → bgp_categories[cost_center_id] → bgp_subcategories`) **por-plano** (`budget_plan_id`); o `financial` tem taxonomia paralela FLAT (`fin_categories` só com `parentId` do #147, sem `costCenterId`; `fin_cost_centers` flat). Não há taxonomia canônica global.

**Escolha = A (Financial ganha `costCenterId`):** pragmático, satisfaz o aceite (costCenterId + árvore navegável + cascata no front) e desbloqueia o front, sem o refactor XL de "budget-plans owner + financial espelha via public-api" (bloqueado pelo escopo per-plano do budget-plans). `budget-plans` fica **intocado**. Duplicação de dado aceita por ora; **budget-plans = owner conceitual** (documentar). Unificação canônica = follow-up/ADR.

## Escopo (in)
1. **Schema:** `fin_categories` += `cost_center_id varchar(36)` NULL (soft ref a `fin_cost_centers`, sem FK física — ADR-0014, igual ao `parent_id`) + índice. Migration gerada.
2. **Domínio:** `Category` += `costCenterId: CostCenterId | null`; `CreateInput` aceita `costCenterId?`; smart constructor default null.
3. **Read + borda:** `category-read.drizzle` seleciona/rehidrata `cost_center_id`; `categoriesToDto` + `categoryResponseSchema` (Zod) expõem `costCenterId` (nullable). Back-compat total.
4. **Seed:** `ReferenceCategorySeed` += `costCenterId?`; adapters/mapper propagam. (Popular a taxonomia real do legado = **follow-up**; aqui só a capacidade + o shape.)
5. **Doc:** nota curta — `budget-plans` é o owner conceitual; o financial reference carrega `costCenterId` espelhando a estrutura (cascata Centro→Cat→Subcat via `costCenterId` + `parentId`).

## Fora de escopo
- Seed real do legado (ETL/ACL) → follow-up. Refactor de ownership canônico → follow-up/ADR. Endpoint consolidado `/financial/references` (segue 3 rotas). `budget-plans` (intocado).

## Critérios de aceite
- **CA1** `fin_categories.cost_center_id` (NULL) persiste; `Category` domínio expõe `costCenterId`; read + DTO + schema Zod expõem `costCenterId` (nullable).
- **CA2** Cascata navegável: com `costCenterId` (top-level) + `parentId` (subcategoria) no payload, o front monta Centro→Categoria→Subcategoria.
- **CA3** Back-compat: categorias pré-existentes (sem `cost_center_id`) leem como `costCenterId: null`, sem quebrar consumidores atuais.
- **CA4** Migration valida no MySQL 8.4 real (OrbStack); read retorna `costCenterId`.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — domínio `Category` c/ costCenterId + read expõe costCenterId |
| W1 | `drizzle-schema-author` + `ts-domain-modeler` | schema+migration + domínio + read adapter + DTO/schema + seed shape |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (OrbStack) |

## DoD
Gate W3 verde + migration validada no OrbStack + read retornando `costCenterId`. Entrega a capacidade completa da cascata 3-níveis no reference do financial.
