# W1 — Implementação GREEN · AUTH-DOMAIN-OUTBOX

> Skill: `ports-and-adapters` · Outcome: **GREEN** · 13/13 novos verdes · suíte 2813 pass / 0 fail

## Criados
- `src/modules/auth/adapters/persistence/schemas/mysql.ts` — tabela `auth_outbox` (prefixo `auth`,
  ADR-0014; varchar/datetime(3)/smallint, payload varchar — sem JSON nativo, ADR-0020).
- `src/modules/auth/application/ports/outbox.ts` — port `OutboxPort` + re-export de `#src/shared/outbox`.
- `src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts`.
- `src/modules/auth/adapters/persistence/repos/outbox-repository.drizzle.ts` — `append` + `appendOutboxInTx` + drift-guard.
- `src/modules/auth/application/email-events.ts` — builders `passwordResetRequestedMessage` / `userInvitedMessage` (payload autocontido).
- `src/modules/auth/adapters/persistence/migrations/mysql/0007_careless_orphan.sql` — editada à mão (ENGINE/charset + `COLLATE utf8mb4_bin` em `event_id`/`aggregate_id`).
- 4 arquivos de teste em `tests/modules/auth/{adapters,application}/`.

## Alterados
- `domain/session/password-reset-token-repository.ts` — `+saveWithEvents` + tipo estrutural puro
  `PasswordResetOutboxMessage` (payload opaco; sem import de application/infra — pureza preservada).
- `application/use-cases/request-password-reset.ts` e `create-user-by-admin.ts` — emissão atômica.
- `adapters/persistence/repos/password-reset-token-repository.{drizzle,in-memory}.ts`.
- `adapters/http/composition.ts` — injeta `InMemoryAuthOutbox` no driver memory.

## Atomicidade
`saveWithEvents(token, events)` no adapter Drizzle envolve `upsertTokenInTx` + `appendOutboxInTx` numa
única `db.transaction` — token e evento commitam/rollback juntos (ADR-0015). O use case **não** coordena
a tx (quem coordena é o adapter — ports-and-adapters). Dark-launch: envio atual intacto.
