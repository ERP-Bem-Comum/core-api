# Agent Memory — mysql-database-expert

- [adr-0020-prohibitions](adr-0020-prohibitions.md) — ADR-0020 proíbe explicitamente stored procs/triggers/eventos agendados no SGBD; lógica de negócio vive no TS
- [auto-expire-db-hypothesis-session](auto-expire-db-hypothesis-session.md) — Sessão de análise: hipóteses MySQL EVENT vs UPDATE vs read-model para o auto-expire de contratos
- [remittance-toctou-789-lock-review](remittance-toctou-789-lock-review.md) — #789 CWE-367: gap lock em chave ausente/índice não-único NÃO é mutex — vira deadlock, não proteção; FOR UPDATE por PK é a correção válida
- [fin-remittance-payables-lock-order-review](fin-remittance-payables-lock-order-review.md) — releitura sob lock em índice não-único reabre gap-lock deadlock (padrão #803); preferir deixar FK RESTRICT ser a autoridade dentro do statement que já existe
- [gap-lock-not-a-mutex-heuristic](gap-lock-not-a-mutex-heuristic.md) — ⚠️ FOR UPDATE sobre chave AUSENTE/não-única não é mutex; vira deadlock 1213 no INSERT, não espera limpa
- [rr-snapshot-only-first-consistent-read](rr-snapshot-only-first-consistent-read.md) — só a 1ª consistent read fixa snapshot em RR; locking read não fixa nem consome; Refman avisa que misturar os dois é frágil
