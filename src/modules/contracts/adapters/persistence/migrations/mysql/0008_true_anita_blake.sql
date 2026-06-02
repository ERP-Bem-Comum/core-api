-- CTR-CONTRACT-REGISTRATION-METADATA — metadados de cadastro (ADR-0032).
-- `classification`/`contract_model` são NOT NULL. Backfill explícito (Decisão A do
-- ticket): adiciona NULLABLE, preenche linhas existentes com o default semântico
-- mais seguro ('Contract'/'Service'), e só então aplica NOT NULL. Em base nova/vazia
-- os UPDATE/MODIFY são no-ops; em base com dados, garante a migration sem ER_NO_DEFAULT_FOR_FIELD.
ALTER TABLE `ctr_contracts` ADD `classification` varchar(16);--> statement-breakpoint
UPDATE `ctr_contracts` SET `classification` = 'Contract' WHERE `classification` IS NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY `classification` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `contract_model` varchar(16);--> statement-breakpoint
UPDATE `ctr_contracts` SET `contract_model` = 'Service' WHERE `contract_model` IS NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY `contract_model` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `category` varchar(16);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `cost_center` varchar(16);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `observations` varchar(1000);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_classification_chk` CHECK (`ctr_contracts`.`classification` IN ('Contract','ServiceOrder'));--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_contract_model_chk` CHECK (`ctr_contracts`.`contract_model` IN ('Service','Donation'));--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_category_chk` CHECK (`ctr_contracts`.`category` IN ('Evaluation','Operational','Process'));--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_cost_center_chk` CHECK (`ctr_contracts`.`cost_center` IN ('HR','GeneralServices','Events'));
