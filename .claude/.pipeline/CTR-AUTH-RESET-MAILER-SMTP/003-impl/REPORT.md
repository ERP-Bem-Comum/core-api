# W1 — Implementação (GREEN)

- `adapters/http/composition.ts`: helper `buildResetMailer(env)` — `parseSmtpConfig(env)` + `AUTH_RESET_FROM` (via `parseEmailAddress`) válidos → `makeEmailPasswordResetMailer({ emailSender: createNodemailerEmailSender(smtp), from })`; senão → no-op seguro (`sendResetLink: async () => ok(undefined)`). `buildAuthHttpDeps` agora usa `buildResetMailer(process.env)` em vez do no-op inline.
- Imports cross-módulo via `notifications/public-api` (ADR-0006): `parseSmtpConfig`, `createNodemailerEmailSender`, `parseEmailAddress`.
- Teste do adapter `makeEmailPasswordResetMailer` (fake EmailSender).

Sem mudança no use case nem na rota (já prontos do BE-REC-003). Boot resiliente: sem SMTP → no-op.
