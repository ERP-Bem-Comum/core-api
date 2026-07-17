# W1 — GREEN · BGP-ETL-LEGACY-ID (fatia 1/3 do ETL-BUDGET-PLANS)

> Objetivo da wave: adicionar `legacy_id INT NULL` + `uniqueIndex` de coluna única nas 6 tabelas
> `bgp_*`, tornando GREEN os 12 testes estruturais RED do W0. Skill: `drizzle-schema-author`.
> Só schema + migration versionada (ADR-0020) — zero lógica de negócio.

## Arquivos tocados
- Editado `src/modules/budget-plans/adapters/persistence/schemas/mysql.ts` — 6 colunas
  `legacyId: int('legacy_id')` (nullable) + 6 `uniqueIndex('bgp_<tabela>_legacy_id_uq').on(t.legacyId)`.
  `int` e `uniqueIndex` já estavam importados — nenhum import novo.
- Gerado `.../migrations/mysql/0009_futuristic_eternity.sql` via `pnpm run db:generate:budget-plans`
  (nunca SQL à mão — ADR-0020). Última era 0008; a nova é 0009.
- Gerado/atualizado `.../migrations/mysql/meta/0009_snapshot.json` + `meta/_journal.json` (formatados).

## Diff conceitual (6 colunas + 6 uniques)
Molde de auth/partners/financial ("Idempotência da ETL: UNIQUE em legacy_id — múltiplos NULL
permitidos no InnoDB"):

| Código | Física | Coluna | UNIQUE (coluna única) |
| :-- | :-- | :-- | :-- |
| budgetPlans | bgp_budget_plans | legacy_id INT NULL | bgp_budget_plans_legacy_id_uq |
| budgets | bgp_budgets | legacy_id INT NULL | bgp_budgets_legacy_id_uq |
| costCenters | bgp_cost_centers | legacy_id INT NULL | bgp_cost_centers_legacy_id_uq |
| categories | bgp_categories | legacy_id INT NULL | bgp_categories_legacy_id_uq |
| subcategories | bgp_subcategories | legacy_id INT NULL | bgp_subcategories_legacy_id_uq |
| budgetResults | bgp_budget_results | legacy_id INT NULL | bgp_budget_results_legacy_id_uq |

Decisões (todas travadas pelo W0): (1) nullable, sem `.notNull()` (CA2 exige múltiplos NULL);
(2) UNIQUE de coluna única, nunca em índice composto; (3) nome `_uq` (molde financial; teste é
name-agnostic); (4) comentário PT-BR ASCII em cada coluna e índice.

## Migration 0009_futuristic_eternity.sql
6 `ADD legacy_id int;` (nullable) + 6 `ADD CONSTRAINT bgp_<tabela>_legacy_id_uq UNIQUE(legacy_id);`.
Aditiva pura, não toca colunas existentes. NÃO editada à mão. Nomes de constraint dentro do limite de
64 chars do MySQL.

## Prova do GREEN (pnpm test puro, sem DB) — verificada pelo orquestrador
| Métrica | Antes (W0 RED) | Depois (W1) |
| :-- | :-- | :-- |
| tests | 4189 | 4189 |
| pass | 4158 | 4170 |
| fail | 12 | 0 |
| skipped | 19 | 19 |
4158 + 12 = 4170 — os 12 RED viraram GREEN, zero regressão.
- typecheck: verde (0 erros).
- format:check: verde.

## Observações para o W2
- Integração NÃO rodada de propósito — os 19 testes MYSQL_INTEGRATION=1 (CA1×6, CA2×6, CA3×6, CA4×1)
  são W3 (`pnpm run test:integration:budget-plans`); o banco de dev pode não estar de pé aqui.
- Aditiva/reversível: só ADD COLUMN nullable + ADD CONSTRAINT UNIQUE; nenhum insert existente muda.
- YAGNI: nenhuma FK física, índice extra ou mudança em repo/mapper (isso é fatia 2/3).

## Próximo passo
W2 (REVIEW) com code-reviewer — audit read-only do diff em mysql.ts + migration 0009.
