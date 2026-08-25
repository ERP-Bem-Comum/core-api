ALTER TABLE `fin_payables` ADD `payment_detail` varchar(255);--> statement-breakpoint
-- Backfill: o título existente herda o complemento da sua nota, que é o valor que ele SEMPRE teve
-- na prática — até agora a remessa lia `fin_documents.payment_detail` para todos eles. Sem isto todo
-- boleto já lançado ficaria sem código de barras no dia em que a remessa passar a ler o título.
--
-- Idempotente pelo `IS NULL`: re-aplicar não pisa o complemento de um título que já divergiu da nota
-- por `updatePayablePayment`. É a mesma propriedade do seed de 0012, por outro meio — lá
-- `ON DUPLICATE KEY UPDATE`, aqui o predicado.
UPDATE `fin_payables` `p`
	JOIN `fin_documents` `d` ON `d`.`id` = `p`.`document_id`
	SET `p`.`payment_detail` = `d`.`payment_detail`
	WHERE `p`.`payment_detail` IS NULL;