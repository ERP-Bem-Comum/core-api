# NOTIF-EMAIL-DEPLOY-CONFIG — composição de e-mail 100% configurável por deploy (env)

> Origem: issue **#117** (follow-up) + pedido direto do autor: tornar "qual e-mail / tipo de domínio /
> maneira de enviar" **totalmente personalizável a nível de deploy**.
> Materializa o ADR-0010: _"Trocar provider = trocar 1 linha na composition root"_
> (`handbook/architecture/adr/0010-email-port-adapter-pattern.md:79`) → vira **1 env var no deploy**.

## Tamanho

**M** — fábrica de composição + decorator + rewire dos call-sites (auth + partners). Sem schema novo.

## Objetivo

Uma fábrica única `buildEmailSender(env)` no módulo `notifications` que resolve, **só por env e
validada no boot**: (1) o **provider** (maneira de enviar), (2) o **remetente** (qual e-mail/domínio),
global e por tipo de fluxo, (3) **sandbox** (redirect em não-prod). Erro de config = boot falha com
mensagem clara (nunca silencioso).

## Eixos configuráveis (todos os 4, conforme acordado)

1. **`EMAIL_PROVIDER`** = `smtp` | `resend` | `memory`.
   - `smtp` → `createNodemailerEmailSender(parseSmtpConfig(env))` (exige `SMTP_*`).
   - `resend` → `createResendEmailSender(parseResendConfig(env))` (exige `RESEND_API_KEY`).
   - `memory` → `createInMemoryEmailSender` (dev/test; não envia).
   - **Ausente (compat):** `SMTP_*` válidos → `smtp`; senão → `memory` (preserva o comportamento atual
     implícito do `buildResetMailer`).
   - Valor inválido, ou provider escolhido sem suas envs → `Result` err → boot falha.
2. **`EMAIL_FROM`** (global) — remetente padrão, ex.: `"Bem Comum <no-reply@dominio>"`.
3. **Remetente por tipo** (sobrepõe o global; fallback nele):
   `EMAIL_FROM_RESET`, `EMAIL_FROM_INVITE`, `EMAIL_FROM_NOTIFICATION`.
   **Compat legado:** `AUTH_RESET_FROM`/`AUTH_INVITE_FROM` aceitos como alias (deprecados) quando os
   novos não estão setados.
4. **`EMAIL_SANDBOX_TO`** — quando setado, um **decorator** `withSandboxRedirect` reescreve
   `to`/`cc`/`bcc` para essa caixa (ADR-0010 §"Decorators opcionais"). Setar só fora de prod.

## Decisões de design travadas

- **Parser puro** `parseEmailConfig(env): Result<EmailConfig, EmailConfigError>` no
  `notifications/adapters/email/` — molde de `parseSmtpConfig`/`parseResendConfig` (sem `process.env`
  interno; injeção explícita; testável por objeto literal).
- **Fábrica** `buildEmailSender(env): Result<EmailSender, EmailConfigError>` resolve provider +
  aplica `withSandboxRedirect` quando há `EMAIL_SANDBOX_TO`. Exposta na `public-api`.
- **Resolução de remetente** `resolveFrom(kind, config): EmailAddress` (`kind`: `reset|invite|notification`).
- **Rewire (sem duplicação):** `auth/adapters/http/composition.ts` (`buildResetMailer`/`buildInviteMailer`)
  e `partners/.../collaborator-invite-mailer` passam a consumir a fábrica + `resolveFrom`. Mantêm o
  no-op SEGURO só quando `provider=memory` sem remetente (boot resiliente em dev).
- **ADR:** não contradiz ADR-0010 (amplia as envs). Sem novo ADR; documentar as envs novas no request
  e onde o catálogo de secrets referenciar.

## Fora de escopo (follow-up)

- Migrar `invite`/`collaborator-invite` para o **outbox** (é o outro follow-up, ticket próprio).
- Observabilidade por e-mail (status/bounce/rate-limit). Webhooks de bounce (ADR-0010 §"NÃO entra").

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — memory.** Dado `EMAIL_PROVIDER=memory`, Quando `buildEmailSender`, Então retorna o InMemory
  (não envia externamente).
- **CA2 — smtp ok / faltando.** Dado `EMAIL_PROVIDER=smtp` com `SMTP_*` completos, Então retorna o
  Nodemailer; Dado `SMTP_*` incompleto, Então `Result` err (boot falha com campo faltante).
- **CA3 — resend ok / faltando.** Dado `EMAIL_PROVIDER=resend` com `RESEND_API_KEY`, Então retorna o
  Resend; sem a key, Então err.
- **CA4 — provider inválido.** Dado `EMAIL_PROVIDER=foo`, Então err (boot falha; valor inválido citado).
- **CA5 — ausente (compat).** Dado `EMAIL_PROVIDER` ausente + `SMTP_*` válidos, Então resolve `smtp`;
  ausente + sem `SMTP_*`, Então resolve `memory`.
- **CA6 — from global.** Dado `EMAIL_FROM` setado e nenhum override, Quando `resolveFrom('reset')`,
  Então retorna o endereço global.
- **CA7 — from por tipo.** Dado `EMAIL_FROM_RESET` setado, Quando `resolveFrom('reset')`, Então retorna
  o do tipo (não o global); `resolveFrom('invite')` sem override → global.
- **CA8 — compat legado.** Dado só `AUTH_RESET_FROM` (sem `EMAIL_FROM*`), Quando `resolveFrom('reset')`,
  Então usa o alias legado.
- **CA9 — sandbox.** Dado `EMAIL_SANDBOX_TO=qa@x`, Quando o sender decorado envia uma mensagem com
  `to=[user@y]`, Então o `EmailSender` subjacente recebe `to=[qa@x]` (cc/bcc idem); sem a env, envia ao
  destinatário original.
- **CA10 — from inválido.** Dado `EMAIL_FROM` malformado, Então err no boot.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem
regressão nos testes existentes de reset/invite. Sem `npm` (ADR-0012). Tabela das envs novas
documentada. Cobertura: `parseEmailConfig`/`resolveFrom`/`withSandboxRedirect` (unit) + fábrica por
provider (unit) + rewire do reset/invite (não quebrar).
