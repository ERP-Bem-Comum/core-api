# W0 — Tests (RED)

`tests/modules/auth/adapters/notifications/password-reset-mailer.email.test.ts` (novo):
- monta a EmailMessage e envia pelo EmailSender (to, from, link no corpo);
- e-mail inválido → `reset-mail-failed` (não envia);
- falha do EmailSender → `reset-mail-failed`.

RED inicial: o adapter `makeEmailPasswordResetMailer` não tinha cobertura própria (o use case usava
fake mailer). O wiring `buildResetMailer` não existia.
