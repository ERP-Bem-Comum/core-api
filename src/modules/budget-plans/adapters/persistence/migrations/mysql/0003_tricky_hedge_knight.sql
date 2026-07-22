-- US4/#318: árvore de planos. parent_id UUID → COLLATE utf8mb4_bin (padrão do projeto p/ FK/refs UUID).
ALTER TABLE `bgp_budget_plans` DROP INDEX `bgp_budget_plans_year_program_ref_uq`;--> statement-breakpoint
ALTER TABLE `bgp_budget_plans` ADD `parent_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `bgp_budget_plans` ADD `scenario_name` varchar(255);--> statement-breakpoint
ALTER TABLE `bgp_budget_plans` ADD CONSTRAINT `bgp_budget_plans_year_program_ref_version_uq` UNIQUE(`year`,`program_ref`,`version_major`,`version_minor`);--> statement-breakpoint
CREATE INDEX `bgp_budget_plans_parent_id_idx` ON `bgp_budget_plans` (`parent_id`);