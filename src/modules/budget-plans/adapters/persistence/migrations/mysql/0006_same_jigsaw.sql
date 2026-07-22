DROP INDEX `bgp_budget_results_budget_id_idx` ON `bgp_budget_results`;--> statement-breakpoint
ALTER TABLE `bgp_budget_results` ADD `month` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `bgp_budget_results` ADD CONSTRAINT `bgp_budget_results_budget_subcategory_month_uq` UNIQUE(`budget_id`,`subcategory_id`,`month`);--> statement-breakpoint
ALTER TABLE `bgp_budget_results` ADD CONSTRAINT `bgp_budget_results_month_chk` CHECK (`bgp_budget_results`.`month` BETWEEN 1 AND 12);