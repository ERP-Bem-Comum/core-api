-- Migration: módulo financial — read-model de fornecedor (US2 #47 / FIN-SUPPLIER-VIEW-SCHEMA).
--
-- Editado manualmente para CHARSET/COLLATE (Drizzle 0.45.x não expõe table-level; ver
--   `contracts/adapters/persistence/schemas/mysql.ts` §"CHARSET/COLLATE"):
--     - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--     - Coluna UUID (supplier_ref): COLLATE utf8mb4_bin (comparação binária; mais rápida)
CREATE TABLE `fin_supplier_view` (
	`supplier_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(20) NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fin_supplier_view_supplier_ref` PRIMARY KEY(`supplier_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
