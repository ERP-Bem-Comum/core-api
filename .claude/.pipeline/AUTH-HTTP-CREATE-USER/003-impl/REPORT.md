# W1 — Implementação GREEN — AUTH-HTTP-CREATE-USER

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07 · **Design:** nodemailer-email-expert

- `adapters/notifications/invite-mailer.email.ts` — `makeEmailInviteMailer` reusa `EmailSender` de
  `notifications/public-api`; template convite text+html; `recipientName` escapado (anti-XSS).
- `composition.ts` — `buildInviteMailer` (SMTP→Nodemailer; senão no-op seguro); **reusa `dummyPasswordHash`
  como `unusablePasswordHash`**; `createUserByAdmin` nas deps + `AuthHttpDeps`; config `activationBaseUrl`/`inviteTtlSeconds`.
- `users-plugin.ts` — rota `POST /users` (body Zod, `authorize('user:create')`, `adminId` do JWT via
  `req.userId`→`rehydrate`, `sendResult` 201/409/422/502/503).
- `users-schemas.ts`, `server.ts` — schemas + registro.

## Resultado

```
POST /api/v1/users (inject): 5/5 (401, 403, 201, 409 dup, 422 cpf invalido)
```

## Pendência (Docker)
- Coleção Bruno `users/create/`; email real só com SMTP/Ethereal (`AUTH_RESET_FROM`/`AUTH_INVITE_FROM`).
