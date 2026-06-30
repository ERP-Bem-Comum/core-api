# W0 — Testes RED · NOTIF-EMAIL-DEPLOY-CONFIG

> Skill: `tdd-strategist` · Outcome: **RED** · Gate: 3/3 arquivos RED (35 casos)

Testes antes de tocar `src/` (fail-first), falhando por `ERR_MODULE_NOT_FOUND`. Cobrem CA1–CA10.

- `tests/modules/notifications/adapters/email/email-config.test.ts`
  — provider (smtp/resend/memory + ausência/compat + inválido), remetente global/por-tipo/alias legado,
    `EMAIL_SANDBOX_TO`, `from` malformado (CA1–CA8, CA10).
- `tests/modules/notifications/adapters/email/sandbox-redirect.test.ts`
  — `withSandboxRedirect` reescreve `to/cc/bcc`, preserva `from/subject/corpo`; no-op sem env (CA9).
- `tests/modules/notifications/adapters/email/build-email-sender.test.ts`
  — `buildEmailSender` por provider + aplicação do sandbox (CA1–CA5).

35 casos, todos RED.
