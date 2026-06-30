# AUTH-HTTP-CREATE-USER — Borda HTTP da criação + adapter de convite (US3)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US3, tasks T030–T032) · **Branch:** `005-gestao-usuarios`

## Escopo

Fecha a US3: adapter de email do convite + wiring + rota `POST /api/v1/users`. Design consultado com o
`nodemailer-email-expert` (adapter) e reuso do design do `security-backend-expert` (use case já pronto).

- **Adapter** `invite-mailer.email.ts` — `makeEmailInviteMailer({emailSender, from})` reusa `EmailSender`
  de `notifications/public-api`; template de convite text+html; escapa `recipientName` no HTML (anti-XSS).
- **Wiring** `composition.ts` — `buildInviteMailer` (SMTP → Nodemailer; senão no-op seguro); reusa o
  `dummyPasswordHash` existente como `unusablePasswordHash`; `createUserByAdmin` nas deps + `AuthHttpDeps`;
  constantes `DEFAULT_INVITE_TTL`/`DEFAULT_ACTIVATION_BASE_URL` + config.
- **Rota** `POST /api/v1/users` no `users-plugin` (body Zod, `authorize('user:create')`, `sendResult` 201/409/422).

## Critérios de aceite (W0 — fastify.inject, driver memory)

- **CA1**: sem token → 401.
- **CA2**: sem `user:create` → 403.
- **CA3**: body válido → 201 `{ id }`.
- **CA4**: email duplicado → 409.
- **CA5**: cpf inválido → 422.

## Pendência (Docker)
- Coleção Bruno `users/create/`; email real só com SMTP/Ethereal configurado.
