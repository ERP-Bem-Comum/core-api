---
name: remittance-toctou-789-lock-review
description: Laudo de locking para o TOCTOU de #789 (título em duas remessas) — gap lock não é mutex entre SELECTs, e por quê FOR UPDATE em fin_payables (PK) é a correção validada
metadata:
  type: project
---

Issue #789 (CWE-367): `generateRemittance` checava título preso via `findHeldPayableIds` (SELECT sem lock, fora de transação) e só travava tarde, no `save`. Corrida clássica: duas emissões concorrentes liam "livre" e ambas gravavam.

**Veredito técnico (citações completas na mensagem enviada ao team-lead, 2026-08-21):**

1. `SELECT id FROM fin_payables WHERE id IN (...) FOR UPDATE` dentro da transação do `save` — CORRETO. `fin_payables.id` é PK; busca por igualdade em índice único trava só o registro (sem gap), então a segunda transação **espera**, não deadlocka. Refman §17.7.3 (`17-innodb-storage-engine.part01.md:3273,3636`).

2. **Achado reusável, não óbvio:** `FOR UPDATE` sobre uma chave que **ainda não existe**, batendo num índice **não-único** (ex.: `fin_remittance_payables_payable_idx`, que é `index()` não `uniqueIndex()`), não serve de mutex entre `SELECT`s — gap locks da mesma lacuna **não conflitam entre si** (Refman `:3154-3156`). As duas transações passam juntas pelo "está livre?". O que finalmente colide é o `INSERT` depois: o insert-intention lock de cada uma bate no gap lock que a outra ainda segura (retido até commit, porque está em transação aberta) — vira **deadlock 1213 detectado na hora**, não espera limpa, não proteção silenciosa.
   - Heurística geral daqui pra frente: antes de propor `FOR UPDATE` como trava de "isso já existe?", checar se a busca é por índice ÚNICO (record lock, mutex de verdade) ou não-único/sobre valor ausente (gap lock, NÃO é mutex — só bloqueia o INSERT concorrente, produzindo deadlock em vez de proteção).

3. `SELECT ... FOR SHARE` como alternativa — REJEITADA pelo próprio Refman, com exemplo quase idêntico a "checar e depois reservar": S+S é compatível, então duas leituras concorrentes passam juntas e colidem só na escrita (`17-innodb-storage-engine.part01.md:3556-3558`). Nunca usar FOR SHARE para padrão check-then-claim.

4. "Ordenar ids antes do IN evita deadlock por ordem inversa" — FALSO como técnica de aplicação, mas o problema já não existe por outro motivo: o range optimizer normaliza `IN(...)` em intervalos de índice **independente da ordem sintática** (`10-optimization.part01.md:309,358`), e o InnoDB varre o índice sempre na mesma ordem física — logo duas transações com o mesmo conjunto de PKs, em qualquer ordem de escrita do `IN`, já adquirem os locks na mesma ordem. Ordenação manual de ids só importa entre **statements separadas tocando tabelas diferentes** (padrão orders/shipments do best-practice 05), não dentro de um único `IN` sobre um único índice.

5. Mecanismo estruturalmente melhor, mas fora de escopo do ticket: tabela de reserva dedicada com `UNIQUE(payable_id)` — transforma o invariante em constraint de banco (erro 1062 determinístico) em vez de depender de disciplina de lock em `remittance-repository.drizzle.ts`. Recomendado como issue de acompanhamento, não como parte de #789.

**Why:** MySQL não tem índice parcial (`CREATE INDEX ... WHERE`), então "único condicional a status" não tem solução DDL direta — só (a) lock discipline, (b) coluna gerada + desnormalização de status entre tabelas, ou (c) tabela de reserva dedicada. As três têm trade-offs bem diferentes e (b) reintroduz o padrão de "duas verdades sobre o mesmo fato" que já causou o defeito de #794 ([[remittance-payable-identity-defect]] na memória do time).

**How to apply:** Se #789 reabrir ou um caso similar aparecer (invariante "único enquanto vivo" em MySQL), ir direto no heurístico do item 2 antes de aceitar qualquer proposta de `FOR UPDATE` como trava — perguntar primeiro "a chave buscada já existe, e o índice é único?".
