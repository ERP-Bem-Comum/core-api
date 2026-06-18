# W0 — Testes RED · NOTIF-EMAIL-OUTBOX

> Skill: `tdd-strategist` · Outcome: **RED** · Gate: `pass 0 / fail 4`

Testes escritos antes de tocar `src/` (fail-first). Falham por inexistência da API
(`ERR_MODULE_NOT_FOUND`), cobrindo os CAs do `000-request.md`.

## Arquivos criados

- `tests/modules/notifications/adapters/outbox/email-message.mapper.test.ts`
  — round-trip de serialização + **CA6** (3 casos de payload corrupto → DLQ).
- `tests/modules/notifications/adapters/outbox/email-outbox.in-memory.test.ts`
  — **CA1** (persiste pendente: `processedAt=null`, `attempts=0`), **CA2** (idempotência por `idempotencyKey`).
- `tests/modules/notifications/worker/email-worker.test.ts`
  — **CA3** (entrega → `processed`), **CA4** (retry → `failed`+`attempts++`, segue pendente),
    **CA5** (dead-letter ao atingir `maxAttempts`), **CA6** (payload corrupto → DLQ sem consumir tentativa).
    Integração com `EmailSender` fake (sem DB).
- `tests/modules/auth/adapters/notifications/password-reset-mailer.outbox.test.ts`
  — **CA7** (enfileira com link), **CA8** (e-mail malformado → nada enfileirado; 202 preservado).

## Resultado

`tests 4 · pass 0 · fail 4` — todos por módulo inexistente. RED confirmado.
