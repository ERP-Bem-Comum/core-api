# W1 — Implementação GREEN · NOTIF-EMAIL-DEPLOY-CONFIG

> Skill: `ports-and-adapters` · Outcome: **GREEN** · 35/35 verde, suíte completa sem regressão

## Criados

- `src/modules/notifications/adapters/email/email-config.ts` — `parseEmailConfig(env): Result<EmailConfig, EmailConfigError>`
  + `resolveFrom(kind, config)`. Provider `smtp|resend|memory` (ausente = compat: SMTP_* válidos→smtp
  senão memory), remetente global + por tipo (`EMAIL_FROM_{RESET,INVITE,NOTIFICATION}`) com fallback e
  alias legado `AUTH_RESET_FROM`/`AUTH_INVITE_FROM`, `EMAIL_SANDBOX_TO`. Switch exaustivo, `Result` nas bordas.
- `src/modules/notifications/adapters/email/sandbox-redirect.ts` — `withSandboxRedirect(sender, sandboxTo)`
  (reescreve to/cc/bcc; preserva from/subject/corpo). ADR-0010 §Decorators.
- `src/modules/notifications/adapters/email/build-email-sender.ts` — `buildEmailSender(env): Result<EmailSender, EmailConfigError>`
  (provider + sandbox).
- 3 arquivos de teste correspondentes.

## Alterados

- `src/modules/notifications/public-api/index.ts` — expõe `buildEmailSender`, `parseEmailConfig`,
  `resolveFrom`, `withSandboxRedirect` + tipos `EmailConfig/EmailConfigError/EmailProvider/EmailFromKind`.
- `src/modules/auth/adapters/http/composition.ts` — `buildResetMailer`/`buildInviteMailer` religados à
  fábrica + `resolveFrom`; outbox preservado; no-op SEGURO mantido; config inválida = boot falha (throw no adapter).
- `src/modules/partners/adapters/http/composition.ts` — `buildPartnersInviteMailer` religado;
  `PARTNERS_INVITE_FROM` mantido como override de maior precedência sobre `resolveFrom('invite')`.

## Decisões

- `email-config.ts` importa `parse` de `domain/email/address.ts` (não da public-api) p/ evitar ciclo de re-export.
- `resolveFrom` retorna `EmailAddress | undefined`; `undefined` alimenta o no-op SEGURO a montante.
- Config malformada → boot falha alto e claro, nunca silencioso.
