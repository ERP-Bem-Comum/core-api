# NOTIF-EMAIL-OUTBOX-RETIRE — aposentar a fila antiga de e-mail (ADR-0047 fatia 02b)

> Limpeza final do ADR-0047 (issue #151). Com os 3 produtores migrados para evento de domínio +
> consumidor (`email-dispatch`), o caminho antigo de e-mail ficou **inerte**. Esta fatia **remove** o
> código morto e **dropa** as tabelas legadas.

## Tamanho

**M** — remoção + 1 migration de DROP. Risco: nomes ambíguos (ver §"PRESERVAR").

## ⚠️ REMOVER vs PRESERVAR (nomes perigosamente parecidos)

### REMOVER (morto — a fila antiga `notifications_email_outbox`)
- `src/modules/notifications/application/ports/email-outbox.ts` (port `EmailOutbox`)
- `src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts`, `email-outbox.drizzle.ts`, `email-message.mapper.ts`
- Mailers órfãos:
  - `src/modules/auth/adapters/notifications/password-reset-mailer.{email,outbox}.ts`
  - `src/modules/auth/adapters/notifications/invite-mailer.{email,outbox}.ts`
  - `src/modules/partners/adapters/notifications/collaborator-invite-mailer.{email,outbox}.ts`
- Builders órfãos: `buildResetMailer`/`buildInviteMailer` (`auth/.../composition.ts`) e
  `buildPartnersInviteMailer` (`partners/.../composition.ts`) — **e qualquer chamada a eles** (hoje inertes).
- Schema `notifications_email_outbox` (+ `_dead_letter`) em `notifications/.../schemas/mysql.ts` + worker antigo
  `notifications/worker/*` + script `worker:email` + exports órfãos na `notifications/public-api`.
- Os testes desses componentes.

### PRESERVAR (VIVO — não confundir!)
- **`partners/adapters/outbox/par-email-outbox.*`** + `EmailOutboxPort` (port do partners) +
  `createDrizzleParEmailOutboxRepository`/`InMemoryParEmailOutbox` — é o `par_email_outbox` da fatia 03,
  consumido pelo `email-dispatch`. **NÃO remover.**
- **`auth_outbox`** (repo/schema/in-memory) + `auth/public-api/email-events.ts` + `partners/public-api/email-events.ts`.
- **`src/workers/email-dispatch/*`** e o consumidor `notifications/adapters/event-delivery/email-event-delivery.ts`.
- **`buildEmailSender`/`parseEmailConfig`/adapters de envio** (`notifications/adapters/email/*`) — o envio real depende deles.
- `saveWithEvents` nos repos de token (auth + partners) — emissão atômica.

## DROP (migration)
- `notifications`: drop de `notifications_email_outbox` + `_dead_letter` (próxima migration do notifications, `0001`;
  `db:generate:notifications`). **Premissa de segurança:** o envio real nunca foi para produção
  (operacional #135 pendente → `NOTIFICATIONS_DATABASE_URL` nunca provisionado), logo a tabela está vazia e o
  DROP é seguro. Se isso mudar, drenar antes (registrado em #151).

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — zero referência.** Após a remoção, `grep` por `EmailOutbox`(da fila antiga)/`makeOutbox*Mailer`/
  `makeEmail*Mailer`/`createDrizzleEmailOutbox`/`buildResetMailer`/`buildInviteMailer`/`buildPartnersInviteMailer`
  retorna **vazio** em `src/`.
- **CA2 — par_email_outbox intacto.** `email-dispatch` segue lendo `auth_outbox` + `par_email_outbox`; testes do worker e do convite verdes.
- **CA3 — DROP.** Migration `0001` do notifications dropa `notifications_email_outbox`/`_dead_letter`; `db:generate:notifications` subsequente: `No schema changes`.
- **CA4 — envio preservado.** O consumidor (`email-event-delivery`) + `buildEmailSender` seguem intactos; os 3 fluxos (reset/invite/collaborator) continuam emitindo evento e o `email-dispatch` enviando.
- **CA5 — gate verde, regressão zero.**

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem regressão.
Migration `0001` do notifications versionada. Sem `npm` (ADR-0012). Fecha #151 e **conclui o ADR-0047**.
