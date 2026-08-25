ALTER TABLE `fin_manual_entries` ADD `document_number` varchar(60);--> statement-breakpoint
ALTER TABLE `fin_manual_entries` ADD `document_type` varchar(16);--> statement-breakpoint
ALTER TABLE `fin_manual_entries` ADD `issue_date` date;--> statement-breakpoint
ALTER TABLE `fin_manual_entries` ADD `document_value_cents` bigint;