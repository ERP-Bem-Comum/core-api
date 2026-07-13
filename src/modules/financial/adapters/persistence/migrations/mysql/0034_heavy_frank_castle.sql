CREATE TABLE `fin_expected_counterpart` (
	`id` varchar(36) NOT NULL,
	`destination_account_ref` varchar(36) NOT NULL,
	`origin_account_ref` varchar(36) NOT NULL,
	`origin_reconciliation_ref` varchar(36) NOT NULL,
	`origin_transaction_ref` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`movement` varchar(8) NOT NULL,
	`value_cents` bigint NOT NULL,
	`expected_date` date NOT NULL,
	`status` varchar(12) NOT NULL,
	`matched_transaction_ref` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fin_expected_counterpart_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_expected_counterpart_type_chk` CHECK(`fin_expected_counterpart`.`type` IN ('Transfer')),
	CONSTRAINT `fin_expected_counterpart_movement_chk` CHECK(`fin_expected_counterpart`.`movement` IN ('Debit','Credit')),
	CONSTRAINT `fin_expected_counterpart_status_chk` CHECK(`fin_expected_counterpart`.`status` IN ('Pending','Matched','Discarded')),
	CONSTRAINT `fin_expected_counterpart_value_chk` CHECK(`fin_expected_counterpart`.`value_cents` > 0)
);
--> statement-breakpoint
ALTER TABLE `fin_outbox` DROP CONSTRAINT `fin_outbox_aggregate_type_chk`;--> statement-breakpoint
CREATE INDEX `fin_expected_counterpart_destination_status_idx` ON `fin_expected_counterpart` (`destination_account_ref`,`status`);--> statement-breakpoint
CREATE INDEX `fin_expected_counterpart_origin_reconciliation_idx` ON `fin_expected_counterpart` (`origin_reconciliation_ref`);--> statement-breakpoint
ALTER TABLE `fin_outbox` ADD CONSTRAINT `fin_outbox_aggregate_type_chk` CHECK (`fin_outbox`.`aggregate_type` IN ('Document', 'Reconciliation', 'Statement', 'ReconciliationPeriod', 'ExpectedCounterpart'));