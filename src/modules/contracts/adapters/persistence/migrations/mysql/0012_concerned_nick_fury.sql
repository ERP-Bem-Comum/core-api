CREATE TABLE `ctr_amendment_seq` (
	`contract_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`last_seq` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `ctr_amendment_seq_contract_id` PRIMARY KEY(`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `ctr_amendments` ADD `signed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `ctr_amendments` ADD CONSTRAINT `ctr_amendments_signed_at_consistency_chk` CHECK ((`ctr_amendments`.`signed_at` IS NOT NULL) = (`ctr_amendments`.`signed_document_ref` IS NOT NULL));