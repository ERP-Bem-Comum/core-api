-- ADR-0020/0014: ENGINE/charset por tabela + COLLATE utf8mb4_bin em colunas UUID
-- (id/budget_plan_id/cost_center_id/category_id) editados a mao — casamento de collation
-- exigido pela FK (drizzle-kit 0.31.x nao expoe charset/collate).
-- Sem CREATE INDEX nas colunas de FK: o indice implicito do InnoDB (criado pelo ADD FOREIGN KEY)
-- ja cobre o filtro — molde de bgp_budgets.
CREATE TABLE `bgp_categories` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`cost_center_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `bgp_categories_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `bgp_cost_centers` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`budget_plan_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`direction` varchar(16) NOT NULL,
	CONSTRAINT `bgp_cost_centers_id` PRIMARY KEY(`id`),
	CONSTRAINT `bgp_cost_centers_direction_chk` CHECK(`bgp_cost_centers`.`direction` IN ('A PAGAR','A RECEBER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `bgp_subcategories` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`category_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`launch_type` varchar(24) NOT NULL,
	CONSTRAINT `bgp_subcategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `bgp_subcategories_launch_type_chk` CHECK(`bgp_subcategories`.`launch_type` IN ('IPCA','CAED','DESPESAS_PESSOAIS','DESPESAS_LOGISTICAS'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `bgp_categories` ADD CONSTRAINT `bgp_categories_cost_center_id_fk` FOREIGN KEY (`cost_center_id`) REFERENCES `bgp_cost_centers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bgp_cost_centers` ADD CONSTRAINT `bgp_cost_centers_budget_plan_id_fk` FOREIGN KEY (`budget_plan_id`) REFERENCES `bgp_budget_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bgp_subcategories` ADD CONSTRAINT `bgp_subcategories_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `bgp_categories`(`id`) ON DELETE cascade ON UPDATE no action;