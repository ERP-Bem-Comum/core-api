# W1 — Implementação GREEN · NOTIF-EMAIL-OUTBOX

> Outcome: **GREEN** · 13/13 testes do ticket verdes · `typecheck` 0 erros · YAGNI estrito

Reuso do worker genérico `#src/shared/outbox` com `P = EmailMessage` (delivery = `EmailSender.send`).

## Arquivos criados/alterados

**Persistência (notifications — módulo antes virgem):**
- `src/modules/notifications/adapters/persistence/schemas/mysql.ts` — `notifications_email_outbox`
  + `notifications_email_outbox_dead_letter` (ADR-0014 prefixo, ADR-0020 mapeamentos).
- `src/modules/notifications/adapters/persistence/migrations/mysql/0000_silly_goliath.sql`
  — migration `0000` (sem colisão; numeração por módulo). Editada à mão: `ENGINE/CHARSET` +
    `COLLATE utf8mb4_bin` nas colunas UUID.
- `src/modules/notifications/adapters/persistence/drivers/mysql-driver.ts` — `openNotificationsMysql`
  (journal próprio `__drizzle_migrations_notifications`).

**Port + adapters:**
- `src/modules/notifications/application/ports/email-outbox.ts` — port `EmailOutbox.enqueue`
  + tagged errors + re-export dos tipos canônicos de consumo.
- `src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts` + `email-outbox.drizzle.ts`
  — dedup por `idempotency_key` UNIQUE → `EmailOutboxDuplicate`.
- `src/modules/notifications/adapters/outbox/email-message.mapper.ts` — `serializeEmailMessage`
  + `rowToEmailMessage: RowToProcessed<EmailMessage>` (corrupto → DLQ).
- `src/modules/notifications/adapters/event-delivery/event-delivery.email-sender.ts`
  — `EventDelivery<EmailMessage>` que chama `EmailSender.send`.

**Worker:**
- `src/modules/notifications/worker/{outbox-worker.ts,config.ts,run.ts}` — standalone sobre o genérico.
- `package.json` — script `worker:email`; `db:generate:notifications`. `drizzle.config.notifications.ts`.
  `tsconfig.json` — include.
- `src/modules/notifications/public-api/index.ts` — exporta `EmailOutbox`/`EmailOutboxError`.

**Piloto (auth):**
- `src/modules/auth/adapters/notifications/password-reset-mailer.outbox.ts` — enfileira (não envia síncrono).
- `src/modules/auth/adapters/http/composition.ts` — `buildResetMailer` async, outbox-first com fallback
  síncrono/no-op + `close` encadeado no shutdown.
- `request-password-reset.ts` **intacto** → anti-enumeração (202 sempre) preservada.
