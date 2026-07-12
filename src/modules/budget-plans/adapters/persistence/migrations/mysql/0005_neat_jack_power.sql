-- ADR-0020/0014: COLLATE utf8mb4_bin em coluna UUID (updated_by), editado a mao
-- (drizzle-kit 0.31.x nao expoe collate). ADD COLUMN nullable = ALGORITHM=INSTANT
-- no MySQL 8.4 (sem rebuild de tabela); sem ALGORITHM hint necessario.
ALTER TABLE `bgp_budget_plans` ADD `updated_by` varchar(36) COLLATE utf8mb4_bin;