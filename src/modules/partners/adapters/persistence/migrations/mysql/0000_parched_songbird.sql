-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em id/cnpj editados à mão
-- (drizzle-kit 0.45.x não emite charset/collate). Ver schemas/mysql.ts §CHARSET.
CREATE TABLE `par_financiers` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`corporate_name` varchar(255) NOT NULL,
	`legal_representative` varchar(255) NOT NULL,
	`cnpj` varchar(14) COLLATE utf8mb4_bin NOT NULL,
	`telephone` varchar(30) NOT NULL,
	`address` varchar(500) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`deactivated_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `par_financiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_financiers_cnpj_idx` UNIQUE(`cnpj`),
	CONSTRAINT `par_financiers_active_consistency_chk` CHECK((`par_financiers`.`active` = FALSE) = (`par_financiers`.`deactivated_at` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
