ALTER TABLE `bgp_budget_plans` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_budget_results` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_budgets` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_categories` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_cost_centers` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_subcategories` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `bgp_budget_plans` ADD CONSTRAINT `bgp_budget_plans_legacy_id_uq` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `bgp_budget_results` ADD CONSTRAINT `bgp_budget_results_legacy_id_uq` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `bgp_budgets` ADD CONSTRAINT `bgp_budgets_legacy_id_uq` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `bgp_categories` ADD CONSTRAINT `bgp_categories_legacy_id_uq` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `bgp_cost_centers` ADD CONSTRAINT `bgp_cost_centers_legacy_id_uq` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `bgp_subcategories` ADD CONSTRAINT `bgp_subcategories_legacy_id_uq` UNIQUE(`legacy_id`);