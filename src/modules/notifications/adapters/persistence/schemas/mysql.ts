// Schema MySQL — módulo notifications (ADR-0020: MySQL como único dialeto; ADR-0014: prefixo
// `notifications_*` dentro do database `core`).
//
// NOTIF-EMAIL-OUTBOX-RETIRE (ADR-0047 fatia 02b): a fila antiga de e-mail
// (`notifications_email_outbox` + `notifications_email_outbox_dead_letter`) foi APOSENTADA.
// Com os 3 produtores migrados para evento de domínio (`auth_outbox`/`par_email_outbox`) + o
// consumidor `email-dispatch`, o caminho antigo ficou inerte e suas tabelas foram dropadas pela
// migration `0001` deste módulo. O schema ficou vazio (o módulo não possui mais tabelas próprias).
//
// Quando o módulo voltar a precisar de tabela própria, declarar `mysqlTable` aqui e rodar
// `pnpm db:generate:notifications` (editar o SQL com ENGINE/charset e COLLATE utf8mb4_bin em
// colunas UUID — limitação Drizzle 0.45.x).
//
// Sustentação: ADR-0020 §"Convenção", ADR-0014 (prefixo `notifications_*`), ADR-0013 (MySQL 8.4).

export {};
