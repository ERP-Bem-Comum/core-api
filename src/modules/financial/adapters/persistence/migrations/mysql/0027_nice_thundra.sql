CREATE TABLE `fin_payable_view` (
	`payable_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`kind` varchar(10) NOT NULL,
	`retention_type` varchar(10),
	`supplier_ref` varchar(36),
	`contract_ref` varchar(36),
	`category_ref` varchar(36),
	`cost_center_ref` varchar(36),
	`program_ref` varchar(36),
	`value_cents` bigint NOT NULL,
	`due_date` date NOT NULL,
	`status` varchar(12) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fin_payable_view_payable_id` PRIMARY KEY(`payable_id`)
);
--> statement-breakpoint
CREATE INDEX `fin_payable_view_status_idx` ON `fin_payable_view` (`status`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_cost_center_idx` ON `fin_payable_view` (`cost_center_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_category_idx` ON `fin_payable_view` (`category_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_program_idx` ON `fin_payable_view` (`program_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_supplier_idx` ON `fin_payable_view` (`supplier_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_due_date_idx` ON `fin_payable_view` (`due_date`);