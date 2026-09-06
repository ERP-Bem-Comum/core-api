-- Soft delete da conta-cedente (#995, B3/B4): status `Deleted` + o discriminador da chave natural.
--
-- ⚠️ A ORDEM DOS SEIS STATEMENTS É O QUE TORNA ISTO SEGURO, e ela não é arbitrária:
--
--   1. dropa a UNIQUE antiga (4 colunas) — ela não pode coexistir com a nova sobre as mesmas
--      colunas mais uma;
--   2. dropa o CHECK de status — vai voltar aceitando `Deleted`;
--   3. ACRESCENTA `natural_key_slot` com `DEFAULT 'LIVE'`. É aqui que a migration se paga: toda
--      linha existente é `Active` ou `Closed`, e `'LIVE'` é exatamente o valor correto para ela.
--      Nenhum backfill, nenhuma linha a corrigir depois;
--   4. recria a UNIQUE com a quinta coluna. Como todas as linhas existentes têm o mesmo `'LIVE'`,
--      a unicidade cobrada é IDÊNTICA à anterior — a migration não pode falhar por duplicata que
--      já não falhasse antes;
--   5. o CHECK que amarra `Deleted` ao slot (ver `schemas/mysql.ts`);
--   6. o CHECK de status, agora com os três valores.
--
-- A janela entre 1 e 4 fica sem a garantia de unicidade. É aceitável porque a migration roda sozinha,
-- antes de o app subir (job `core-api-migrate`), e porque o passo 4 falharia em vez de deixar passar
-- duplicata — o risco seria de migration abortada, não de dado sujo.
--
-- ⚠️ Por que `'LIVE'` e não NULL: em MySQL, linhas com NULL numa coluna do índice único NÃO contam
-- como duplicatas. Com NULL nas vivas, a unicidade do FR-016 sumiria em silêncio — o efeito INVERSO
-- do pretendido. O raciocínio completo está em `schemas/mysql.ts`, na declaração da UNIQUE.
--
-- `COLLATE utf8mb4_bin` porque a coluna guarda um identificador: comparação de UUID é byte a byte.
ALTER TABLE `fin_cedente_accounts` DROP INDEX `fin_cedente_accounts_natural_key_uq`;--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` DROP CONSTRAINT `fin_cedente_accounts_status_chk`;--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD `natural_key_slot` varchar(36) COLLATE utf8mb4_bin DEFAULT 'LIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD CONSTRAINT `fin_cedente_accounts_natural_key_uq` UNIQUE(`bank_code`,`agency`,`account_number`,`account_digit`,`natural_key_slot`);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD CONSTRAINT `fin_cedente_accounts_status_deleted_chk` CHECK (`fin_cedente_accounts`.`status` <> 'Deleted' OR `fin_cedente_accounts`.`natural_key_slot` = `fin_cedente_accounts`.`id`);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD CONSTRAINT `fin_cedente_accounts_status_chk` CHECK (`fin_cedente_accounts`.`status` IN ('Active','Closed','Deleted'));