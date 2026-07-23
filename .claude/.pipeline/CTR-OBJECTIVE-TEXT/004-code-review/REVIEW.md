# W2 — code review (self, read-only) — CTR-OBJECTIVE-TEXT (#530)

**Veredito: APPROVED.**

- Troca `objective: varchar('objective', { length: 1000 })` → `text('objective').notNull()`. `NOT NULL`
  preservado (CA2) — obrigatoriedade do domínio intacta.
- `objective` **não** participa de índice (verificado por grep) → `TEXT` sem prefixo é seguro; nenhuma
  quebra de índice/UNIQUE.
- Migration `0018_bent_masque.sql`: `ALTER TABLE ctr_contracts MODIFY COLUMN objective text NOT NULL` —
  aditiva, sem perda (`text` acomoda o que `varchar(1000)` já guardava). Snapshot + `_journal.json` gerados.
- ADR-0020: `TEXT` é tipo permitido; `MODIFY COLUMN` é DDL permitido. Sem JSON nativo/ENUM/trigger.
- Domínio sem mudança — não há requisito de cap de tamanho (paridade com o legado).

Sem Blocker/Major/Minor. 1 round.
