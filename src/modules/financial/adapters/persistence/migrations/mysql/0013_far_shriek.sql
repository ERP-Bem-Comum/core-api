CREATE TABLE `fin_cost_centers` (
	`id` varchar(36) NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `fin_cost_centers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `fin_cost_centers_code_idx` ON `fin_cost_centers` (`code`);--> statement-breakpoint
CREATE INDEX `fin_cost_centers_active_idx` ON `fin_cost_centers` (`active`);--> statement-breakpoint
-- Seed idempotente dos centros de custo de referência (020 · US2 / SC-002). UUIDs fixos espelham
-- src/modules/financial/adapters/persistence/seed/reference-cost-centers.ts. Re-aplicável sem duplicar.
INSERT INTO `fin_cost_centers` (`id`, `code`, `name`, `active`) VALUES
('f1cce570-0000-4000-8000-000000000001', 'CC-001', 'Administrativo', true),
('f1cce570-0000-4000-8000-000000000002', 'CC-002', 'Programa Saúde', true),
('f1cce570-0000-4000-8000-000000000003', 'CC-003', 'Programa Educação', true),
('f1cce570-0000-4000-8000-000000000004', 'CC-004', 'Captação de recursos', true),
('f1cce570-0000-4000-8000-000000000005', 'CC-005', 'Projetos sociais', true) AS new
ON DUPLICATE KEY UPDATE `code` = new.`code`, `name` = new.`name`, `active` = new.`active`;