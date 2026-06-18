-- NOTIF-EMAIL-OUTBOX-RETIRE (ADR-0047 fatia 02b, issue #151): aposenta a fila antiga de e-mail.
-- Premissa de segurança: o envio real nunca foi para produção (#135 pendente →
-- NOTIFICATIONS_DATABASE_URL nunca provisionado), logo as tabelas estão vazias e o DROP é seguro.
-- Se isso mudar, drenar antes de aplicar.
DROP TABLE `notifications_email_outbox`;--> statement-breakpoint
DROP TABLE `notifications_email_outbox_dead_letter`;