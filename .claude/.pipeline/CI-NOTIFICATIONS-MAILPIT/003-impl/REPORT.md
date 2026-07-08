# W1 — REPORT (CI-NOTIFICATIONS-MAILPIT, #135/US4)

> **GREEN.** Config + workflow implementados; **premissa falha do ticket corrigida** e validada ao vivo no x99.

## Implementado
1. **Runner** `scripts/ci/test-integration.ts`: type `Suite.services` ganha `'mailpit'`; suíte
   `notifications` passa a `services: ['mailpit']` + envs SMTP (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`,
   `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=false`, creds dummy) além do gate `NOTIFICATIONS_INTEGRATION=1`.
2. **Workflow** `.github/workflows/integration-notifications.yml`: path filter (notifications/email-dispatch/
   runner/self), `workflow_dispatch`, `permissions: contents:read`, actions **pinadas por SHA** (mesmos SHAs do `ci.yml`).

## Achado que mudou o escopo (premissa do ticket era falha)
A suíte `nodemailer.integration.test.ts` usava **Ethereal** (`nodemailer.createTestAccount()`, SMTP online
externo) — **ignorava as envs SMTP**. Subir o Mailpit no runner não a faria usá-lo. Só apareceu porque
**validei de verdade no x99** (o ticket original "confiaria no CI"). Correções (decisão do dono: migrar p/ Mailpit):
- `nodemailer.integration.test.ts`: a config do teste (`smtpConfig()`) passa a **preferir as envs SMTP**
  (→ Mailpit no CI, SMTP efêmero local, sem rede externa); **fallback Ethereal** local se envs ausentes.
  **O adapter `createNodemailerEmailSender` NÃO foi tocado** — é o mesmo Nodemailer que fala com o **Amazon
  SES em produção**; muda só para ONDE o teste aponta.
- **CA-T8** tinha input errado: `@invalid` cai no catch-all `transport-failed` do adapter (não em
  `smtp-rejected`), tanto no Ethereal quanto no Mailpit — o teste nunca fora validado contra servidor real.
  Trocado para envelope sem recipient (`to: []`) → Nodemailer "No recipients defined" (EENVELOPE) →
  `invalid-recipient`, **determinístico** em qualquer SMTP. Adapter intocado.

## Validação ao vivo (x99 — Mailpit real via túnel SSH)
- Config do runner (teste W0): **5/5 GREEN**.
- Suíte de e-mail contra Mailpit (`docker run` mailpit no x99 + túnel `-L 1025`): **3/3 GREEN**
  (CA-T7 envio real 93ms · CA-T8 invalid-recipient · CA-T9 transport-failed). Sem rede externa.
