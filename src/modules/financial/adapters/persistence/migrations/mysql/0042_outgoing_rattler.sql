ALTER TABLE `fin_payable_view` ADD `budget_plan_ref` varchar(36);--> statement-breakpoint
CREATE INDEX `fin_payable_view_budget_plan_ref_idx` ON `fin_payable_view` (`budget_plan_ref`);