-- Migration: módulo financial — tabelas `fin_*` (fatia 1: Document + Payables + Retentions + RegisteredTaxes)
--
-- Gerado por: `pnpm exec drizzle-kit generate --config drizzle.config.financial.ts`
-- Editado manualmente para CHARSET/COLLATE:
--   Limitação Drizzle 0.45.x: não expõe charset/collate table-level (documentado em
--   `contracts/adapters/persistence/schemas/mysql.ts` §"CHARSET/COLLATE").
--   Regra (igual ao módulo contracts):
--     - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--     - Colunas UUID (id, FKs document_id, approved_by): COLLATE utf8mb4_bin
--       (comparação binária — mais rápida para UUIDs; elimina drift Unicode em FK matches)
--
-- FKs ON DELETE CASCADE: autorizado pelo boundary do agregado Document (Evans + data-model.md
-- §"A delete operation must remove everything within the AGGREGATE boundary at once").

CREATE TABLE `fin_documents` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_number` varchar(60),
	`series` varchar(20),
	`type` varchar(16),
	`supplier_ref` varchar(36) COLLATE utf8mb4_bin,
	`contract_ref` varchar(36) COLLATE utf8mb4_bin,
	`budget_plan_ref` varchar(36) COLLATE utf8mb4_bin,
	`category_ref` varchar(36) COLLATE utf8mb4_bin,
	`program_ref` varchar(36) COLLATE utf8mb4_bin,
	`payment_method` varchar(24),
	`gross_value` bigint,
	`source_discounts` bigint NOT NULL DEFAULT 0,
	`discounts` bigint NOT NULL DEFAULT 0,
	`penalty` bigint NOT NULL DEFAULT 0,
	`interest` bigint NOT NULL DEFAULT 0,
	`net_value` bigint,
	`status` varchar(16) NOT NULL,
	`description` varchar(500),
	`due_date` date,
	`read_by_ocr` boolean NOT NULL DEFAULT false,
	`ocr_original_value` bigint,
	`divergence_detected` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`approved_at` datetime(3),
	`approved_by` varchar(36) COLLATE utf8mb4_bin,
	CONSTRAINT `fin_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_documents_type_chk` CHECK(`fin_documents`.`type` IS NULL OR `fin_documents`.`type` IN ('NFS-e','DANFE','RPA','Fatura','Boleto','Recibo','Imposto')),
	CONSTRAINT `fin_documents_payment_method_chk` CHECK(`fin_documents`.`payment_method` IS NULL OR `fin_documents`.`payment_method` IN ('TED','TransferenciaBancaria','PIX','Boleto','CartaoCorporativo','Cambio','GuiaRecolhimento','Outro')),
	CONSTRAINT `fin_documents_status_chk` CHECK(`fin_documents`.`status` IN ('Draft','Open','Approved','Transmitted','Refused','Paid','Reconciled')),
	CONSTRAINT `fin_documents_gross_value_chk` CHECK(`fin_documents`.`gross_value` IS NULL OR `fin_documents`.`gross_value` >= 0),
	CONSTRAINT `fin_documents_net_value_chk` CHECK(`fin_documents`.`net_value` IS NULL OR `fin_documents`.`net_value` >= 0),
	CONSTRAINT `fin_documents_source_discounts_chk` CHECK(`fin_documents`.`source_discounts` >= 0),
	CONSTRAINT `fin_documents_discounts_chk` CHECK(`fin_documents`.`discounts` >= 0),
	CONSTRAINT `fin_documents_penalty_chk` CHECK(`fin_documents`.`penalty` >= 0),
	CONSTRAINT `fin_documents_interest_chk` CHECK(`fin_documents`.`interest` >= 0),
	CONSTRAINT `fin_documents_version_chk` CHECK(`fin_documents`.`version` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_payables` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`kind` varchar(8) NOT NULL,
	`retention_type` varchar(8),
	`status` varchar(16) NOT NULL,
	`value` bigint NOT NULL,
	`due_date` date NOT NULL,
	`payment_method` varchar(24) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `fin_payables_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_payables_kind_chk` CHECK(`fin_payables`.`kind` IN ('Parent','Child')),
	CONSTRAINT `fin_payables_retention_type_chk` CHECK(`fin_payables`.`retention_type` IS NULL OR `fin_payables`.`retention_type` IN ('ISS','IRRF','INSS','CSRF')),
	CONSTRAINT `fin_payables_status_chk` CHECK(`fin_payables`.`status` IN ('Draft','Open','Approved','Transmitted','Refused','Paid','Reconciled')),
	CONSTRAINT `fin_payables_payment_method_chk` CHECK(`fin_payables`.`payment_method` IN ('TED','TransferenciaBancaria','PIX','Boleto','CartaoCorporativo','Cambio','GuiaRecolhimento','Outro')),
	CONSTRAINT `fin_payables_value_chk` CHECK(`fin_payables`.`value` >= 0),
	CONSTRAINT `fin_payables_child_retention_chk` CHECK((`fin_payables`.`kind` = 'Child') = (`fin_payables`.`retention_type` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_registered_taxes` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`type` varchar(16) NOT NULL,
	`base` bigint NOT NULL,
	`rate_bps` int NOT NULL,
	`value` bigint NOT NULL,
	CONSTRAINT `fin_registered_taxes_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_registered_taxes_type_chk` CHECK(`fin_registered_taxes`.`type` IN ('ICMS','IPI','PIS','COFINS','CBS','IBS_Municipal','IBS_Estadual')),
	CONSTRAINT `fin_registered_taxes_base_chk` CHECK(`fin_registered_taxes`.`base` >= 0),
	CONSTRAINT `fin_registered_taxes_rate_bps_chk` CHECK(`fin_registered_taxes`.`rate_bps` >= 0),
	CONSTRAINT `fin_registered_taxes_value_chk` CHECK(`fin_registered_taxes`.`value` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_retentions` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`type` varchar(8) NOT NULL,
	`base` bigint NOT NULL,
	`rate_bps` int NOT NULL,
	`value` bigint NOT NULL,
	CONSTRAINT `fin_retentions_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_retentions_type_chk` CHECK(`fin_retentions`.`type` IN ('ISS','IRRF','INSS','CSRF')),
	CONSTRAINT `fin_retentions_base_chk` CHECK(`fin_retentions`.`base` >= 0),
	CONSTRAINT `fin_retentions_rate_bps_chk` CHECK(`fin_retentions`.`rate_bps` >= 0),
	CONSTRAINT `fin_retentions_value_chk` CHECK(`fin_retentions`.`value` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_payables` ADD CONSTRAINT `fin_payables_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `fin_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fin_registered_taxes` ADD CONSTRAINT `fin_registered_taxes_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `fin_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fin_retentions` ADD CONSTRAINT `fin_retentions_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `fin_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fin_documents_supplier_ref_idx` ON `fin_documents` (`supplier_ref`);--> statement-breakpoint
CREATE INDEX `fin_documents_status_idx` ON `fin_documents` (`status`);--> statement-breakpoint
CREATE INDEX `fin_documents_due_date_idx` ON `fin_documents` (`due_date`);--> statement-breakpoint
CREATE INDEX `fin_documents_doc_number_idx` ON `fin_documents` (`document_number`);--> statement-breakpoint
CREATE INDEX `fin_payables_document_id_idx` ON `fin_payables` (`document_id`);--> statement-breakpoint
CREATE INDEX `fin_payables_status_idx` ON `fin_payables` (`status`);--> statement-breakpoint
CREATE INDEX `fin_registered_taxes_document_id_idx` ON `fin_registered_taxes` (`document_id`);--> statement-breakpoint
CREATE INDEX `fin_retentions_document_id_idx` ON `fin_retentions` (`document_id`);
