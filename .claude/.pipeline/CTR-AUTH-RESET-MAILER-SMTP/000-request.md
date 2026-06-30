# CTR-AUTH-RESET-MAILER-SMTP — Fia o Nodemailer real no mailer de reset (follow-up BE-REC-003)

> **Size:** S · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`.

## Escopo

Substituir o mailer no-op do reset (BE-REC-003) pelo **Nodemailer real** quando o SMTP estiver
configurado, mantendo o no-op seguro como fallback em dev/test sem SMTP.

## Env vars (ADR-0010)

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (+ opcionais `SMTP_POOL`,
`SMTP_MAX_CONNS`) — parseados por `parseSmtpConfig`. Mais `AUTH_RESET_FROM` (remetente do e-mail).

## Critérios de aceite

- [x] `buildResetMailer(env)`: SMTP válido + `AUTH_RESET_FROM` válido → `createNodemailerEmailSender` + `makeEmailPasswordResetMailer`; senão → no-op seguro.
- [x] Adapter `makeEmailPasswordResetMailer` testado (monta EmailMessage: to/from/corpo com link; email inválido e falha do sender → `reset-mail-failed`).
- [x] Boot resiliente sem SMTP (composition memory não quebra).
- [x] typecheck + lint + format + testes auth verdes.
