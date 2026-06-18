# W1 — Remoção GREEN · NOTIF-EMAIL-OUTBOX-RETIRE

> Skill: `ports-and-adapters` · Outcome: **GREEN** · 2824 pass / 0 fail

## Removidos (19 arquivos)
- Mailers: `auth/.../{password-reset-mailer,invite-mailer}.{email,outbox}.ts` + `partners/.../collaborator-invite-mailer.{email,outbox}.ts`.
- Notifications (fila antiga): `application/ports/email-outbox.ts`, `adapters/outbox/{email-outbox.in-memory,email-outbox.drizzle,email-message.mapper}.ts`, `worker/*` (3).
- 9 testes dos componentes mortos.

## Modificados
- `auth/.../composition.ts` + `partners/.../composition.ts` — removidos `buildResetMailer`/`buildInviteMailer`/`buildPartnersInviteMailer` + imports órfãos.
- `notifications/public-api/index.ts` — removido export `EmailOutbox`/`EmailOutboxError`.
- `notifications/.../schemas/mysql.ts` — esvaziado (placeholder documentado; driver/config mantidos p/ aplicar o DROP no deploy).
- `package.json` — removido `worker:email`.

## DROP
Migration `0001_bouncy_maddog.sql` (notifications) dropa `notifications_email_outbox` + `_dead_letter` (header documenta premissa tabela-vazia, #135). `db:generate:notifications` subsequente → "No schema changes" (CA3).

## Risco tratado
`grep` confirmou que `EmailOutbox`/`createDrizzleEmailOutbox`/`InMemoryEmailOutbox` (notifications, MORTO) ≠
`EmailOutboxPort`/`createDrizzleParEmailOutboxRepository`/`InMemoryParEmailOutbox` (partners, VIVO). Nenhum vivo removido.
