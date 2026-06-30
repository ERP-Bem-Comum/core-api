# W1 — Implementação GREEN · NOTIF-INVITE-OUTBOX

> Skill: `ports-and-adapters` · Outcome: **GREEN** · 10/10 novos testes verdes; sem regressão

## Criados
- `src/modules/auth/adapters/notifications/invite-mailer.outbox.ts` — `makeOutboxInviteMailer({ emailOutbox, from })`;
  idempotencyKey `invite:<token>` (fallback UUID); template idêntico ao síncrono (incl. `escapeHtml`/`htmlBody`);
  `EmailOutboxDuplicate` → sucesso.
- `src/modules/partners/adapters/notifications/collaborator-invite-mailer.outbox.ts` — `makeOutboxCollaboratorInviteMailer`;
  idempotencyKey `collab-invite:<token>`; template idêntico.

## Alterados
- `src/modules/auth/adapters/http/composition.ts` — `buildInviteMailer` async outbox-first
  (Drizzle se `NOTIFICATIONS_DATABASE_URL`; InMemory se só remetente; no-op seguro senão); `close` encadeado no shutdown.
- `src/modules/partners/adapters/http/composition.ts` — `buildPartnersInviteMailer` idem, **preservando precedência
  `PARTNERS_INVITE_FROM` > `resolveFrom('invite')`**; `makeCapturingCollaboratorInviteMailer` (memory) intacto.

Consumo do `EmailOutbox` só via `notifications/public-api` (ADR-0006).
