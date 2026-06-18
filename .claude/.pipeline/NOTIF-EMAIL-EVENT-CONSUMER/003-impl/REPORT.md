# W1 — Implementação GREEN · NOTIF-EMAIL-EVENT-CONSUMER

> Skill: `ports-and-adapters` · Outcome: **GREEN**
> Nota: o sub-agente parou no meio de W1 (limite de turns); a sessão principal **assumiu**, consertou os
> erros de lint pendentes e finalizou. Recorte: **liga+desliga; limpeza/DROP = fatia 02b**.

## Criados
- `src/modules/auth/public-api/email-events.ts` — contrato/decoder versionado de `PasswordResetRequested`/`UserInvited` (consumido pelo `notifications`, ADR-0006).
- `src/modules/notifications/adapters/event-delivery/email-event-delivery.ts` — `EventDelivery`: evento → template (texto/HTML, `escapeHtml`) → `EmailSender.send`.
- `src/workers/email-dispatch/{run.ts,delivery.ts}` — worker dedicado: lê `auth_outbox` (`openAuthMysql`, `AUTH_DATABASE_URL`) → `buildEmailSender(env)` → `runLoop` (retry/backoff/DLQ). Script `worker:email-dispatch`.
- Testes: worker-ops, email-events, email-event-delivery, email-dispatch/delivery, email-no-duplicate-send.

## Alterados
- `src/modules/auth/adapters/persistence/repos/outbox-repository.drizzle.ts` + `auth-outbox.in-memory.ts` — helpers de worker (`withPendingBatch`/`markProcessed`/`markFailed`/`moveToDeadLetter`).
- `src/modules/notifications/public-api/index.ts` — expõe o consumidor.
- `request-password-reset.ts` / `create-user-by-admin.ts` — **removida a chamada ao mailer** (o evento já é emitido na tx; envio é do consumidor → sem duplicação, CA5). Docstring atualizado.
- `auth/.../composition.ts`, `users-plugin.ts` — param de montar os mailers no fluxo.
- `package.json` — script `worker:email-dispatch`.

## Consertos de lint na retomada (sessão principal)
- `email-events.ts`: extraído helper `parseJson` (elimina `let` não-inicializado — `init-declarations`).
- 3 testes: `send: async () => err(...)` → `() => Promise.resolve(err(...))` (`require-await`); cast `as string | undefined` em `create-user-by-admin.test.ts` (`no-base-to-string`).

## Inerte (fica para 02b)
`*.outbox.ts`/`*.email.ts` (mailers), port `EmailOutbox`, `notifications_email_outbox` (código+tabela) — órfãos, não referenciados no fluxo de envio. Sem DROP.
