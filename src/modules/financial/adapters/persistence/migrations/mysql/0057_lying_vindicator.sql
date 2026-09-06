-- fin_convenio_nsa — o contador de NSA passa da CONTA para o CONVÊNIO (#943).
--
-- ENGINE/CHARSET inseridos MANUALMENTE: o drizzle-kit 0.45.x não os emite, e sem eles a tabela
-- herda o default do servidor — que difere entre a instância de dev e a de produção. As demais
-- migrations deste módulo fazem o mesmo (ver 0000, 0001, 0003, 0048).
--
-- ⚠️ O BACKFILL ABAIXO É A PARTE PERIGOSA, e a regra é `MAX`. Leia antes de mexer.
CREATE TABLE `fin_convenio_nsa` (
	`convenio` varchar(30) NOT NULL,
	`next_nsa` int NOT NULL,
	CONSTRAINT `fin_convenio_nsa_convenio` PRIMARY KEY(`convenio`),
	CONSTRAINT `fin_convenio_nsa_next_nsa_chk` CHECK(`fin_convenio_nsa`.`next_nsa` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
-- Semeia a sequência de cada convênio a partir do MAIOR `next_nsa` entre as contas dele.
--
-- POR QUE `MAX`, e por que qualquer outra agregação reemite número já usado:
--
--   `next_nsa` é o PRÓXIMO a alocar, não o último emitido. Então o máximo do grupo é maior ou igual
--   a qualquer número que qualquer conta daquele convênio já tenha emitido. Começar abaixo disso
--   reemite — e reemissão é exatamente o que o Bradesco lê como RETRANSMISSÃO, que é o dano que a
--   #943 existe para impedir.
--
--   Exemplo concreto: convênio X com conta A em 57 e conta B em 12. A emitiu 1–56; B reemitiu 1–11
--   (o defeito). Começar em 57 não colide com nada. Começar em 12 reemitiria 12–56.
--
--   E a colisão não seria só semântica: `fin_remittance_payables.your_number` é
--   `<convênio><NSA><sequência>` com UNIQUE global, e as referências antigas continuam gravadas.
--   Um contador que retrocede bate no índice contra linhas históricas — o mesmo 503 opaco da #942,
--   por outro caminho.
--
-- Contas `Closed` ENTRAM no GROUP BY de propósito: os números que elas gastaram existem no banco, e
-- ignorá-las reabriria faixa já usada.
--
-- Convênio vazio fica de fora: sem convênio não há contrato a que a sequência pertença, e a conta
-- já é recusada antes do NSA por `checkCedenteConvenio` (`cedente-convenio-missing`).
INSERT INTO `fin_convenio_nsa` (`convenio`, `next_nsa`)
SELECT TRIM(`convenio`), MAX(`next_nsa`)
FROM `fin_cedente_accounts`
WHERE TRIM(`convenio`) <> ''
GROUP BY TRIM(`convenio`);
