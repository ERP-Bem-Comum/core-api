-- Migration: módulo partners — Pessoa com Deficiência no formato do cliente (spec 131 do web-app)
--
-- Gerado por: `pnpm run db:generate:partners` (os dois ALTER TABLE).
-- Editado manualmente para a CONVERSÃO DOS DADOS (UPDATEs abaixo), decisão da P.O. de 23/10/2026:
--   - `is_pwd = TRUE`                     → resposta SIM (sem tipo = incompleto, fica aberto);
--   - texto "Qual?" preenchido (Sim ou sem resposta) → SIM com o tipo OUTRA e o MESMO texto;
--   - `is_pwd = FALSE`                    → resposta NAO.
-- `pwd_description` permanece: passa a ser o texto de "Outra". `is_pwd` sai na migration seguinte,
-- separada para o drizzle-kit não tratar a troca como renomeação.
ALTER TABLE `par_collaborators` ADD `pwd_answer` varchar(30);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `pwd_types` varchar(120);--> statement-breakpoint
UPDATE `par_collaborators`
SET `pwd_answer` = 'SIM', `pwd_types` = 'OUTRA', `pwd_description` = TRIM(`pwd_description`)
WHERE (`is_pwd` IS NULL OR `is_pwd` = TRUE)
  AND `pwd_description` IS NOT NULL AND TRIM(`pwd_description`) <> '';--> statement-breakpoint
UPDATE `par_collaborators`
SET `pwd_answer` = 'SIM'
WHERE `is_pwd` = TRUE AND `pwd_answer` IS NULL;--> statement-breakpoint
UPDATE `par_collaborators`
SET `pwd_answer` = 'NAO'
WHERE `is_pwd` = FALSE;
