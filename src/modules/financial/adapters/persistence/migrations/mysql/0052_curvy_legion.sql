-- DLQ por consumidor (#800, #824). O `fin_outbox` tem um consumidor só hoje
-- (`payable-view-projection`) — a PK muda agora justamente porque o `par_outbox` também teve um
-- só, até o dia em que não teve, e o desenho estreito não avisou.
--
-- ⚠️ ORDEM CORRIGIDA À MÃO, como em `contracts/0020` e `partners/0019`: `drizzle-kit generate`
-- emitiu `ADD PRIMARY KEY(consumer_id, event_id)` antes de `ADD consumer_id`, o que falharia.
-- Cláusulas fundidas num único ALTER — forma medida em MySQL 8.4.11 como INPLACE, LOCK=NONE.
--
-- Sem hint de ALGORITHM (`INSTANT` devolve 1845 nesta versão). `fin_outbox_dead_letter` está
-- vazia em todos os ambientes medidos (21/08/2026), então o NOT NULL sem DEFAULT não deixa linha
-- órfã atribuída a consumidor vazio.
ALTER TABLE `fin_outbox_dead_letter`
  ADD `consumer_id` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY(`consumer_id`,`event_id`);
