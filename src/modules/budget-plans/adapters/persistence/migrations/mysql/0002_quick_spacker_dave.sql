-- ADR-0020/0014: ENGINE/charset por tabela + COLLATE utf8mb4_bin em colunas UUID.
-- bgp_budget_results SEM FK (D1): budget_id/subcategory_id são refs por identidade (pai sofre
-- replace-all); índices explícitos cobrem as queries por budget/subcategoria (CA3) e o delete (CA4).
CREATE TABLE `bgp_budget_results` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`budget_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`subcategory_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`model` varchar(24) NOT NULL,
	`value_cents` bigint NOT NULL,
	CONSTRAINT `bgp_budget_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `bgp_budget_results_model_chk` CHECK(`bgp_budget_results`.`model` IN ('IPCA','CAED','DESPESAS_PESSOAIS','DESPESAS_LOGISTICAS'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `bgp_budget_results_budget_id_idx` ON `bgp_budget_results` (`budget_id`);--> statement-breakpoint
CREATE INDEX `bgp_budget_results_subcategory_id_idx` ON `bgp_budget_results` (`subcategory_id`);
