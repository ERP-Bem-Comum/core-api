-- Fornecedor pessoa física (#1022): `cnpj` vira `document` (CPF ou CNPJ) e a razão social e o nome
-- fantasia passam a aceitar NULL — que só a PF usa, amarrado ao documento pelos dois CHECKs.
--
-- Gerada por `pnpm run db:generate:partners`, respondendo "rename" ao prompt do drizzle-kit
-- (`cnpj › document`); só este cabeçalho foi escrito à mão.
--
-- Sem backfill: toda linha existente tem CNPJ de 14 caracteres e razão social/nome fantasia
-- NOT NULL, então os dois CHECKs valem para ela desde já. A janela entre o DROP INDEX e o novo
-- UNIQUE fica sem unicidade; é aceitável porque a migration roda sozinha, antes de o app subir,
-- e o ADD UNIQUE falharia em vez de deixar passar duplicata.
ALTER TABLE `par_suppliers` RENAME COLUMN `cnpj` TO `document`;--> statement-breakpoint
ALTER TABLE `par_suppliers` DROP INDEX `par_suppliers_cnpj_idx`;--> statement-breakpoint
ALTER TABLE `par_suppliers` MODIFY COLUMN `corporate_name` varchar(255);--> statement-breakpoint
ALTER TABLE `par_suppliers` MODIFY COLUMN `fantasy_name` varchar(255);--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD CONSTRAINT `par_suppliers_document_idx` UNIQUE(`document`);--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD CONSTRAINT `par_suppliers_pf_corporate_name_chk` CHECK ((CHAR_LENGTH(`par_suppliers`.`document`) = 11) = (`par_suppliers`.`corporate_name` IS NULL));--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD CONSTRAINT `par_suppliers_pf_fantasy_name_chk` CHECK ((CHAR_LENGTH(`par_suppliers`.`document`) = 11) = (`par_suppliers`.`fantasy_name` IS NULL));