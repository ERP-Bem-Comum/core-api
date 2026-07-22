ALTER TABLE `fin_documents` ADD `subcategory_ref` varchar(36);--> statement-breakpoint
ALTER TABLE `fin_payable_view` ADD `subcategory_ref` varchar(36);--> statement-breakpoint
CREATE INDEX `fin_payable_view_subcategory_ref_idx` ON `fin_payable_view` (`subcategory_ref`);