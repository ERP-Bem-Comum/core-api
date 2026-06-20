CREATE TABLE `fin_categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`group` varchar(12) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `fin_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_categories_group_chk` CHECK(`fin_categories`.`group` IN ('despesa','receita','ajuste'))
);
--> statement-breakpoint
CREATE INDEX `fin_categories_group_name_idx` ON `fin_categories` (`group`,`name`);--> statement-breakpoint
CREATE INDEX `fin_categories_active_idx` ON `fin_categories` (`active`);--> statement-breakpoint
-- Seed idempotente das categorias de referência (020 · D5 / SC-002). UUIDs fixos espelham
-- src/modules/financial/adapters/persistence/seed/reference-categories.ts. Re-aplicável sem duplicar.
INSERT INTO `fin_categories` (`id`, `name`, `group`, `active`) VALUES
('f1ca7e90-0000-4000-8000-000000000001', 'Aluguel', 'despesa', true),
('f1ca7e90-0000-4000-8000-000000000002', 'Folha de pagamento', 'despesa', true),
('f1ca7e90-0000-4000-8000-000000000003', 'Tarifas bancárias', 'despesa', true),
('f1ca7e90-0000-4000-8000-000000000004', 'Materiais e insumos', 'despesa', true),
('f1ca7e90-0000-4000-8000-000000000005', 'Serviços de terceiros', 'despesa', true),
('f1ca7e90-0000-4000-8000-000000000006', 'Doações', 'receita', true),
('f1ca7e90-0000-4000-8000-000000000007', 'Captação de recursos', 'receita', true),
('f1ca7e90-0000-4000-8000-000000000008', 'Convênios e subvenções', 'receita', true),
('f1ca7e90-0000-4000-8000-000000000009', 'Rendimentos financeiros', 'receita', true),
('f1ca7e90-0000-4000-8000-000000000010', 'Ajuste de conciliação', 'ajuste', true),
('f1ca7e90-0000-4000-8000-000000000011', 'Estorno', 'ajuste', true) AS new
ON DUPLICATE KEY UPDATE `name` = new.`name`, `group` = new.`group`, `active` = new.`active`;