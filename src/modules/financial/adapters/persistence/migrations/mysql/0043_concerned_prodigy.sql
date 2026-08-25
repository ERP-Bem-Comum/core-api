ALTER TABLE `fin_bank_statements` MODIFY COLUMN `file_hash` varchar(64) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_categories` MODIFY COLUMN `id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_categories` MODIFY COLUMN `parent_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_categories` MODIFY COLUMN `cost_center_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_cost_centers` MODIFY COLUMN `id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_documents` MODIFY COLUMN `subcategory_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_documents` MODIFY COLUMN `cost_center_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_documents` MODIFY COLUMN `source_file_hash_sha256` varchar(64) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_documents` MODIFY COLUMN `approver_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `destination_account_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `origin_account_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `origin_reconciliation_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `origin_transaction_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` MODIFY COLUMN `matched_transaction_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_manual_entries` MODIFY COLUMN `destination_account_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_outbox` MODIFY COLUMN `event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_outbox` MODIFY COLUMN `aggregate_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_outbox_dead_letter` MODIFY COLUMN `event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_outbox_dead_letter` MODIFY COLUMN `aggregate_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
-- #637 · fin_payable_view: TRUNCATE antes dos MODIFY, por decisão explícita.
--
-- Esta tabela é read-model reconstruível por projeção (ADR-0022), alimentada pelo consumer
-- `payable-view-projection` a partir do fin_outbox. Ela não guarda dado original: tudo que está
-- aqui é derivado de fin_payables ⋈ fin_documents.
--
-- MODIFY COLUMN com troca de collation é ALGORITHM=COPY no MySQL 8.4 — rebuild da tabela inteira.
-- Com a tabela VAZIA o rebuild é instantâneo, e as 10 colunas abaixo saem de graça. Pagar rebuild
-- numa tabela que existe justamente para ser descartável seria o pior dos dois mundos.
--
-- ⚠️ OPERACIONAL: depois desta migration a grid de títulos fica VAZIA até o backfill repovoar
-- (job `payable-view-backfill`, #411). Aplicar em janela combinada, não no meio do expediente.
TRUNCATE TABLE `fin_payable_view`;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `payable_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `supplier_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `contract_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `category_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `budget_plan_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `subcategory_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `cost_center_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `program_ref` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `fin_payable_view` MODIFY COLUMN `debit_account_ref` varchar(36) COLLATE utf8mb4_bin;