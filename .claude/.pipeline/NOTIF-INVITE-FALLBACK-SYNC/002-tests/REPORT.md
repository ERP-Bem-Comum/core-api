# W0 — Testes RED · NOTIF-INVITE-FALLBACK-SYNC

> Skill: `tdd-strategist` · Outcome: **RED** · 2 arquivos / 7 casos

- `tests/modules/auth/adapters/http/invite-mailer-fallback.test.ts`
- `tests/modules/partners/adapters/http/collaborator-invite-mailer-fallback.test.ts`

Provam CA1–CA3: sem `NOTIFICATIONS_DATABASE_URL`, com provider+remetente, o fallback usa o
`EmailSender` síncrono (não InMemory outbox). RED por builder não exportado / sem seam de teste.
