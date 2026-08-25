CREATE TABLE `fin_remittance_payables` (
	`remittance_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`payable_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`your_number` varchar(20) NOT NULL,
	CONSTRAINT `fin_remittance_payables_remittance_id_payable_id_pk` PRIMARY KEY(`remittance_id`,`payable_id`),
	CONSTRAINT `fin_remittance_payables_your_number_uk` UNIQUE(`your_number`)
);
--> statement-breakpoint
CREATE INDEX `fin_remittance_payables_payable_idx` ON `fin_remittance_payables` (`payable_id`);--> statement-breakpoint
CREATE INDEX `fin_remittance_payables_document_idx` ON `fin_remittance_payables` (`document_id`);--> statement-breakpoint
-- Backfill dos vínculos já emitidos, de `fin_remittance_documents`.
--
-- O título escolhido é o PAI, e não é arbitrário: enquanto a remessa era por documento, o valor
-- emitido vinha de `fin_documents.net_value` — que é exatamente o valor do título `Parent`. As
-- retenções nunca saíram naqueles arquivos, então vinculá-las aqui afirmaria um pagamento que não
-- aconteceu, e o primeiro retorno do banco baixaria um título que ninguém pagou.
--
-- `your_number` é preservado como está: é fato histórico da emissão e a chave pela qual o retorno
-- vai chegar. Recalcular romperia o casamento de todo arquivo já enviado e ainda sem retorno.
--
-- Idempotente pelo `NOT EXISTS` sobre `your_number` (que é UNIQUE): reaplicar não duplica nem
-- levanta erro. Documento sem título `Parent` — que não deveria existir — simplesmente não casa no
-- JOIN e fica de fora, em vez de derrubar a migration inteira.
INSERT INTO `fin_remittance_payables` (`remittance_id`, `payable_id`, `document_id`, `your_number`)
SELECT `rd`.`remittance_id`, `p`.`id`, `rd`.`document_id`, `rd`.`your_number`
FROM `fin_remittance_documents` `rd`
	JOIN `fin_payables` `p`
		ON `p`.`document_id` = `rd`.`document_id` AND `p`.`kind` = 'Parent'
WHERE NOT EXISTS (
	SELECT 1 FROM `fin_remittance_payables` `x` WHERE `x`.`your_number` = `rd`.`your_number`
);