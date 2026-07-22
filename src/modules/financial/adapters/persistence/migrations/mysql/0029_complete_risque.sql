ALTER TABLE `fin_payable_view` ADD `debit_account_ref` varchar(36);--> statement-breakpoint
ALTER TABLE `fin_payable_view` ADD `paid_at` date;--> statement-breakpoint
CREATE INDEX `fin_payable_view_paid_at_idx` ON `fin_payable_view` (`paid_at`);