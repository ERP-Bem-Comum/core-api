# Agent Memory — mysql-database-expert

- [adr-0020-prohibitions](adr-0020-prohibitions.md) — ADR-0020 proíbe explicitamente stored procs/triggers/eventos agendados no SGBD; lógica de negócio vive no TS
- [auto-expire-db-hypothesis-session](auto-expire-db-hypothesis-session.md) — Sessão de análise: hipóteses MySQL EVENT vs UPDATE vs read-model para o auto-expire de contratos
- [remittance-toctou-789-lock-review](remittance-toctou-789-lock-review.md) — #789 CWE-367: gap lock em chave ausente/índice não-único NÃO é mutex — vira deadlock, não proteção; FOR UPDATE por PK é a correção válida
