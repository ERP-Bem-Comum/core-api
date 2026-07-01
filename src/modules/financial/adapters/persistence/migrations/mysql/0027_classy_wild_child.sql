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
	CONSTRAINT `fin_payable_view_payable_id` PRIMARY KEY(`payable_id`),
	CONSTRAINT `fin_payable_view_kind_chk` CHECK(`fin_payable_view`.`kind` IN ('Parent','Child')),
	CONSTRAINT `fin_payable_view_status_chk` CHECK(`fin_payable_view`.`status` IN ('Open','Approved','Paid','Cancelled')),
	CONSTRAINT `fin_payable_view_retention_type_chk` CHECK(`fin_payable_view`.`retention_type` IS NULL OR `fin_payable_view`.`retention_type` IN ('ISS','IRRF','INSS','CSRF'))
);
--> statement-breakpoint
CREATE INDEX `fin_payable_view_status_idx` ON `fin_payable_view` (`status`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_cost_center_ref_idx` ON `fin_payable_view` (`cost_center_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_category_ref_idx` ON `fin_payable_view` (`category_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_program_ref_idx` ON `fin_payable_view` (`program_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_supplier_ref_idx` ON `fin_payable_view` (`supplier_ref`);--> statement-breakpoint
CREATE INDEX `fin_payable_view_due_date_idx` ON `fin_payable_view` (`due_date`);