-- PAR-COLLABORATOR-FIELDS (#41/#42/#40) — expande par_collaborators com PERFIL, TERRITÓRIO e
-- BANCÁRIO. Aditivo backward-compatible: todas as colunas NULLABLE (colaboradores legados sem os
-- campos seguem válidos). Espelha o bloco banco/pix de par_suppliers. CHARSET/COLLATE/ENGINE da
-- tabela permanecem (utf8mb4 / utf8mb4_unicode_ci); colunas novas herdam o default da tabela —
-- nenhuma é UUID/CNPJ, logo sem utf8mb4_bin. Editado à mão (drizzle-kit indisponível no ambiente;
-- mesma disciplina do cabeçalho de schemas/mysql.ts: ENGINE/charset/CHECKs manuais).
ALTER TABLE `par_collaborators` ADD `sex` varchar(1);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `marital_status` varchar(20);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `has_children` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `children_count` int;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `children_ages` varchar(255);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `is_pwd` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `pwd_description` varchar(500);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `is_on_leave` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_duration` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_renewable` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_renewal_duration` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `public_sector_experience_duration` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `territory_uf` varchar(2);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `territory_municipality` varchar(255);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `bank_account_bank` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `bank_account_agency` varchar(20);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `bank_account_number` varchar(30);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `bank_account_check_digit` varchar(5);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `pix_key_type` varchar(20);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `pix_key` varchar(255);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD CONSTRAINT `par_collaborators_bank_block_chk` CHECK ((`par_collaborators`.`bank_account_bank` IS NULL) = (`par_collaborators`.`bank_account_agency` IS NULL)
        AND (`par_collaborators`.`bank_account_bank` IS NULL) = (`par_collaborators`.`bank_account_number` IS NULL)
        AND (`par_collaborators`.`bank_account_bank` IS NULL) = (`par_collaborators`.`bank_account_check_digit` IS NULL));--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD CONSTRAINT `par_collaborators_pix_block_chk` CHECK ((`par_collaborators`.`pix_key_type` IS NULL) = (`par_collaborators`.`pix_key` IS NULL));--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD CONSTRAINT `par_collaborators_marital_status_chk` CHECK (`par_collaborators`.`marital_status` IS NULL OR `par_collaborators`.`marital_status` IN ('single','married','divorced','widowed','stable_union'));--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD CONSTRAINT `par_collaborators_sex_chk` CHECK (`par_collaborators`.`sex` IS NULL OR `par_collaborators`.`sex` IN ('F','M'));
