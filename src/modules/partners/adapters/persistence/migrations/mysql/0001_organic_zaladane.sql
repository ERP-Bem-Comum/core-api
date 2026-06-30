-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em id/cnpj editados à mão
-- (drizzle-kit 0.45.x não emite charset/collate). Ver schemas/mysql.ts §CHARSET.
CREATE TABLE `par_suppliers` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`cnpj` varchar(14) COLLATE utf8mb4_bin NOT NULL,
	`corporate_name` varchar(255) NOT NULL,
	`fantasy_name` varchar(255) NOT NULL,
	`service_category` varchar(50) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`deactivated_at` datetime(3),
	`bank_account_bank` varchar(50),
	`bank_account_agency` varchar(20),
	`bank_account_number` varchar(30),
	`bank_account_check_digit` varchar(5),
	`pix_key_type` varchar(20),
	`pix_key` varchar(255),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `par_suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_suppliers_cnpj_idx` UNIQUE(`cnpj`),
	CONSTRAINT `par_suppliers_active_consistency_chk` CHECK((`par_suppliers`.`active` = FALSE) = (`par_suppliers`.`deactivated_at` IS NOT NULL)),
	CONSTRAINT `par_suppliers_payment_target_chk` CHECK((`par_suppliers`.`bank_account_bank` IS NOT NULL) OR (`par_suppliers`.`pix_key` IS NOT NULL)),
	CONSTRAINT `par_suppliers_bank_block_chk` CHECK((`par_suppliers`.`bank_account_bank` IS NULL) = (`par_suppliers`.`bank_account_agency` IS NULL)
        AND (`par_suppliers`.`bank_account_bank` IS NULL) = (`par_suppliers`.`bank_account_number` IS NULL)
        AND (`par_suppliers`.`bank_account_bank` IS NULL) = (`par_suppliers`.`bank_account_check_digit` IS NULL)),
	CONSTRAINT `par_suppliers_pix_block_chk` CHECK((`par_suppliers`.`pix_key_type` IS NULL) = (`par_suppliers`.`pix_key` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
