CREATE TABLE `ctr_amendments` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`contract_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`amendment_number` varchar(32) NOT NULL,
	`description` varchar(1000) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`impact_value_cents` bigint,
	`new_end_date` datetime(3),
	`status` varchar(16) NOT NULL,
	`signed_document_ref` varchar(36) COLLATE utf8mb4_bin,
	`homologated_at` datetime(3),
	`homologated_by` varchar(36) COLLATE utf8mb4_bin,
	CONSTRAINT `ctr_amendments_id` PRIMARY KEY(`id`),
	CONSTRAINT `ctr_amendments_kind_chk` CHECK(`ctr_amendments`.`kind` IN ('Addition','Suppression','TermChange','Misc')),
	CONSTRAINT `ctr_amendments_status_chk` CHECK(`ctr_amendments`.`status` IN ('Pending','Homologated')),
	CONSTRAINT `ctr_amendments_homologation_completeness_chk` CHECK(
        `ctr_amendments`.`status` <> 'Homologated'
        OR (
          `ctr_amendments`.`homologated_at` IS NOT NULL
          AND `ctr_amendments`.`homologated_by` IS NOT NULL
          AND `ctr_amendments`.`signed_document_ref` IS NOT NULL
        )
      )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `ctr_contract_homologated_amendments` (
	`contract_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`amendment_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	CONSTRAINT `ctr_contract_homologated_amendments_contract_id_amendment_id_pk` PRIMARY KEY(`contract_id`,`amendment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `ctr_contracts` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`sequential_number` varchar(16) NOT NULL,
	`title` varchar(255) NOT NULL,
	`objective` varchar(1000) NOT NULL,
	`signed_at` datetime(3) NOT NULL,
	`original_value_cents` bigint NOT NULL,
	`original_period_kind` varchar(16) NOT NULL,
	`original_period_start` datetime(3) NOT NULL,
	`original_period_end` datetime(3),
	`current_value_cents` bigint NOT NULL,
	`current_period_kind` varchar(16) NOT NULL,
	`current_period_start` datetime(3) NOT NULL,
	`current_period_end` datetime(3),
	`status` varchar(16) NOT NULL,
	`ended_at` datetime(3),
	CONSTRAINT `ctr_contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `ctr_contracts_sequential_number_unique` UNIQUE(`sequential_number`),
	CONSTRAINT `ctr_contracts_original_period_kind_chk` CHECK(`ctr_contracts`.`original_period_kind` IN ('Fixed','Indefinite')),
	CONSTRAINT `ctr_contracts_current_period_kind_chk` CHECK(`ctr_contracts`.`current_period_kind` IN ('Fixed','Indefinite')),
	CONSTRAINT `ctr_contracts_status_chk` CHECK(`ctr_contracts`.`status` IN ('Active','Expired','Terminated')),
	CONSTRAINT `ctr_contracts_ended_at_consistency_chk` CHECK((`ctr_contracts`.`ended_at` IS NOT NULL) = (`ctr_contracts`.`status` IN ('Expired','Terminated')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `ctr_amendments` ADD CONSTRAINT `ctr_amend_contract_fk` FOREIGN KEY (`contract_id`) REFERENCES `ctr_contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ctr_contract_homologated_amendments` ADD CONSTRAINT `ctr_chom_amends_contract_fk` FOREIGN KEY (`contract_id`) REFERENCES `ctr_contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ctr_contract_homologated_amendments` ADD CONSTRAINT `ctr_chom_amends_amendment_fk` FOREIGN KEY (`amendment_id`) REFERENCES `ctr_amendments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ctr_amendments_contract_id_idx` ON `ctr_amendments` (`contract_id`);--> statement-breakpoint
CREATE INDEX `ctr_contracts_status_idx` ON `ctr_contracts` (`status`);--> statement-breakpoint
CREATE INDEX `ctr_contracts_signed_at_idx` ON `ctr_contracts` (`signed_at`);
