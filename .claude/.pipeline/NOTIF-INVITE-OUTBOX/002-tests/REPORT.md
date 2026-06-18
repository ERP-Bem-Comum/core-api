# W0 — Testes RED · NOTIF-INVITE-OUTBOX

> Skill: `tdd-strategist` · Outcome: **RED** · 2 arquivos falhando por `ERR_MODULE_NOT_FOUND`

- `tests/modules/auth/adapters/notifications/invite-mailer.outbox.test.ts`
  — CA1 (enfileira, sem envio síncrono), CA3 (template/link preservados), CA4 (duplicata → no-op), borda + anti-XSS.
- `tests/modules/partners/adapters/notifications/collaborator-invite-mailer.outbox.test.ts`
  — CA2/CA3/CA4 análogos para o convite de colaborador.

10 casos, todos RED (API inexistente).
