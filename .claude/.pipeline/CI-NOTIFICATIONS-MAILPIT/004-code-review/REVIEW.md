# W2 — REVIEW (CI-NOTIFICATIONS-MAILPIT, #135/US4)

> **APPROVED.**

## Revisado (read-only)
- **`scripts/ci/test-integration.ts`** — `Suite.services` ganha `'mailpit'`; suíte `notifications` sobe
  `mailpit` (profile `mail` ativado por nomeação no `up`) + envs SMTP. `secrets: false` correto (mailpit
  não usa file-secrets). Padrão idêntico à suíte `storage` (minio). OK.
- **`.github/workflows/integration-notifications.yml`** — path filter cobre notifications + email-dispatch +
  o próprio runner/workflow (roda quando qualquer um muda). `workflow_dispatch` presente. `permissions:
  contents:read` (least-privilege). Actions pinadas por SHA (reusa os do `ci.yml`). OK.
- **`tests/scripts/test-integration-notifications-script.test.ts`** — asserção de estrutura (molde auth-script);
  `RegExp#exec` (lint). OK.
- **`tests/modules/notifications/adapters/email/nodemailer.integration.test.ts`** — `smtpConfig()` prefere
  envs (Mailpit), fallback Ethereal. **Adapter intocado** (SES em prod preservado — cobrança do dono).

## Ponto de atenção (transparência)
A mudança tocou um teste de **outro ticket** (CTR-EMAIL-ADAPTER-NODEMAILER): migração Ethereal→Mailpit +
correção do input do CA-T8. Justificado: (a) decisão explícita do dono (migrar p/ Mailpit); (b) o CA-T8
falhava contra qualquer servidor real (input `@invalid` → catch-all `transport-failed`), nunca fora
validado; (c) o adapter não mudou. É melhoria do teste, não regressão de cobertura.

Sem achados Blocker/Major/Minor. APPROVED.
