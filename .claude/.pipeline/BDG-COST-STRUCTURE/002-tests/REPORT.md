# W0 — REPORT (BDG-COST-STRUCTURE, #316 · Fatia 2 US2)

> **Owner:** skill `tdd-strategist`. Research: `Explore` (legado ERP-BACKEND) + `mysql-database-expert` (decisão de schema, memória).

## Modelo (portado do legado `ERP-BACKEND/src/modules/cost-centers`)
Árvore FIXA 3 níveis, tabelas separadas por nível (não adjacency com parent_id):
- **CostCenter** (raiz): `name`, `direction` (`"A PAGAR"` | `"A RECEBER"` — valores exatos do legado `CostCenterType`). FK → plano.
- **Category** (meio): `name`. FK → cost-center.
- **Subcategory** (folha): `name`, `launchType` — um dos **4**: `IPCA` / `CAED` / `DESPESAS_PESSOAIS` / `DESPESAS_LOGISTICAS` (`SubCategoryReleaseType`; enum compartilhado com US3/#317). FK → category.
- Editabilidade: escrita só com plano em `RASCUNHO`/`EM_CALIBRACAO`; `APROVADO` → bloqueado.

## Schema (decisão mysql-database-expert, memória — confirmada)
3 tabelas tipadas `bgp_cost_centers`/`bgp_categories`/`bgp_subcategories`, adjacency FK `ON DELETE CASCADE`;
`direction` NOT NULL só na raiz, `launch_type` NOT NULL só na folha; `WITH RECURSIVE` dispensável (3 SELECTs
+ montagem em app). UUID varchar(36) `utf8mb4_bin` (casamento p/ FK). Prefixo **`bgp_`** (real da Fatia 1;
o 000-request dizia `bdg_` por engano). Sem `UNIQUE(parent,name)` especulativo (YAGNI — unicidade em código).

## Testes RED (domínio puro — W0)
- `launch-type.test.ts`: `LaunchType.parse` — 4 válidos + inválido.
- `cost-direction.test.ts`: `CostDirection.parse` — 2 válidos + inválido.
- `cost-structure.test.ts`:
  - **CA1** monta CostCenter→Category→Subcategory e lê a árvore (direction na raiz, launchType na folha).
  - **CA2** add/edit nó com plano editável; nome vazio → `cost-node-name-required`; nó órfão (pai inexistente) → `cost-node-parent-not-found`.
  - **CA3** qualquer escrita com plano `APROVADO` → `budget-plan-not-editable`.

W1: VOs (`launch-type`/`cost-direction`), `types`, `cost-structure` (operações + editabilidade), `errors` +
schema Drizzle `bgp_*` + repo (in-memory + drizzle) + borda HTTP (GET árvore + escrita). Validar schema com `mysql-database-expert`.
