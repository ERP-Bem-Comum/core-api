# W0 — Testes RED · NOTIF-EMAIL-EVENT-CONSUMER

> Skill: `tdd-strategist` · Outcome: **RED**

Testes antes de tocar `src/` (fail-first), cobrindo CA1–CA8:
- `tests/modules/auth/adapters/outbox/auth-outbox.worker-ops.test.ts` — helpers de claim (`withPendingBatch`/`markProcessed`/`markFailed`/`moveToDeadLetter`).
- `tests/modules/auth/public-api/email-events.test.ts` — decoder versionado de `PasswordResetRequested`/`UserInvited` + payload corrupto.
- `tests/modules/notifications/adapters/event-delivery/email-event-delivery.test.ts` — evento → template → `EmailSender` (reset/invite, anti-XSS, falha → err).
- `tests/workers/email-dispatch/delivery.test.ts` — entrega + retry (`markFailed`) + DLQ (`maxAttempts`).
- `tests/modules/auth/application/use-cases/email-no-duplicate-send.test.ts` — use cases não chamam mailer (CA5).

Falham por inexistência da API.
