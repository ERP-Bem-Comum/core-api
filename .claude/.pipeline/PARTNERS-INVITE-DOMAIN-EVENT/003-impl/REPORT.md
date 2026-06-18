# W1 — Implementação GREEN · PARTNERS-INVITE-DOMAIN-EVENT

> Skill: `ports-and-adapters` · Outcome: **GREEN**

## Criados
- `src/modules/partners/adapters/persistence/schemas/mysql.ts` → `par_email_outbox` (prefixo `par_`, ADR-0014/0020).
- `src/modules/partners/adapters/persistence/migrations/mysql/0016_natural_pyro.sql` (+ snapshot).
- `src/modules/partners/adapters/persistence/repos/email-outbox-repository.drizzle.ts` — `append`/`appendOutboxInTx` + helpers de worker (claim `SKIP LOCKED`, retry, DLQ).
- `src/modules/partners/public-api/email-events.ts` — decoder versionado de `CollaboratorInvited`.
- builders do evento + adapter InMemory do `par_email_outbox`.

## Alterados
- `src/modules/partners/application/use-cases/issue-collaborator-invite.ts` — emite `CollaboratorInvited` na MESMA tx do save do invite-token (via `saveWithEvents` no `CollaboratorInviteTokenRepository`); **removida** a chamada ao mailer.
- `src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.{drizzle,in-memory}.ts` — `saveWithEvents`.
- `src/modules/partners/adapters/http/composition.ts` — para de montar o mailer no fluxo do convite.
- `src/modules/notifications/adapters/event-delivery/email-event-delivery.ts` — caso `CollaboratorInvited` → template autocadastro (`escapeHtml`).
- `src/workers/email-dispatch/run.ts` — **multi-fonte**: lê `auth_outbox` (`AUTH_DATABASE_URL`) + `par_email_outbox` (`PARTNERS_DATABASE_URL`), 2 `runLoop` concorrentes com o mesmo delivery; degradação graciosa se `PARTNERS_DATABASE_URL` ausente.

Atomicidade (rollback conjunto) e `auth_outbox` intactos.
