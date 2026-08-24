-- DLQ por consumidor (#800). A desistência é de UM consumidor, não do evento.
--
-- ⚠️ ORDEM CORRIGIDA À MÃO, pelo mesmo motivo da `contracts/0020`: `drizzle-kit generate` emitiu
-- `ADD PRIMARY KEY(consumer_id, event_id)` antes de `ADD consumer_id` — a PK referenciaria coluna
-- inexistente e o ALTER falharia. As três cláusulas foram fundidas num único ALTER, que é a forma
-- medida em MySQL 8.4.11 como INPLACE, LOCK=NONE.
--
-- Sem hint de ALGORITHM: `ALGORITHM=INSTANT` devolve 1845 no ADD PRIMARY KEY nesta versão.
-- `consumer_id NOT NULL` sem DEFAULT: `par_outbox_dead_letter` está vazia em todos os ambientes
-- medidos (21/08/2026); com linhas, elas receberiam string vazia e precisariam de backfill antes.
ALTER TABLE `par_outbox_dead_letter`
  ADD `consumer_id` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY(`consumer_id`,`event_id`);
