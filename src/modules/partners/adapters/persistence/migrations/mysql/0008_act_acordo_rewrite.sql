-- EPIC-PAR-ACT-ACORDO — reescreve `par_acts`: pessoa-física → Acordo de Cooperação Técnica.
-- D3 (P.O.): os ACTs atuais são apenas seed de teste (sem produção) → DROP + CREATE descontinua
-- os dados antigos. COLLATE utf8mb4_bin em `id`/`cnpj` (UUID/CNPJ — comparação binária); vigência
-- (`validity`) em duas colunas `date` (PlainDate); repasse CONDICIONal via CHECK.
DROP TABLE IF EXISTS `par_acts`;
--> statement-breakpoint
CREATE TABLE `par_acts` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`act_number` varchar(60) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`cnpj` varchar(14) COLLATE utf8mb4_bin NOT NULL,
	`corporate_name` varchar(255) NOT NULL,
	`fantasy_name` varchar(255) NOT NULL,
	`occupation_area` varchar(10) NOT NULL,
	`legal_representative` varchar(255) NOT NULL,
	`validity_start` date NOT NULL,
	`validity_end` date NOT NULL,
	`has_financial_transfer` boolean NOT NULL,
	`bank_account_bank` varchar(50),
	`bank_account_agency` varchar(20),
	`bank_account_number` varchar(30),
	`bank_account_check_digit` varchar(5),
	`pix_key_type` varchar(20),
	`pix_key` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`deactivated_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`legacy_id` int,
	CONSTRAINT `par_acts_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_acts_act_number_idx` UNIQUE(`act_number`),
	CONSTRAINT `par_acts_legacy_id_idx` UNIQUE(`legacy_id`),
	CONSTRAINT `par_acts_active_consistency_chk` CHECK((`par_acts`.`active` = FALSE) = (`par_acts`.`deactivated_at` IS NOT NULL)),
	CONSTRAINT `par_acts_payment_target_chk` CHECK((`par_acts`.`has_financial_transfer` = FALSE) OR (`par_acts`.`bank_account_bank` IS NOT NULL) OR (`par_acts`.`pix_key` IS NOT NULL)),
	CONSTRAINT `par_acts_bank_block_chk` CHECK((`par_acts`.`bank_account_bank` IS NULL) = (`par_acts`.`bank_account_agency` IS NULL)
        AND (`par_acts`.`bank_account_bank` IS NULL) = (`par_acts`.`bank_account_number` IS NULL)
        AND (`par_acts`.`bank_account_bank` IS NULL) = (`par_acts`.`bank_account_check_digit` IS NULL)),
	CONSTRAINT `par_acts_pix_block_chk` CHECK((`par_acts`.`pix_key_type` IS NULL) = (`par_acts`.`pix_key` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
