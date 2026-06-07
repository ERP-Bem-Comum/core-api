# W1 — Implementação GREEN — AUTH-USECASE-CREATE-USER

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07 · **Design:** security-backend-expert

- `domain/identity/user/events.ts` — `UserCreated` (`userId`, `email`, `createdByAdminId`, `occurredAt` — sem PII/hash) + `UserEvent`.
- `domain/identity/user/user.ts` — `CreateByAdminInput` + `User.create` (ActiveUser, perfil completo, `unusablePasswordHash` placeholder, roles=[]).
- `application/ports/invite-mailer.ts` — port `InviteMailer` (ISP, separado do reset).
- `application/use-cases/create-user-by-admin.ts` — valida → unicidade email → `User.create` → save → token de ativação → `inviteMailer.sendInvite` (URL de config, fail-closed).

## Resultado

```
create-user-by-admin: 8/8 (testes de segurança)
```

**Segurança validada:** placeholder não-autenticável (passwordHash = hash injetado, não senha); convite 1×;
URL de origem confiável (anti host-injection); email dup sem side-effect; fail-closed no envio; `UserCreated`
sem PII; token TTL correto.

## Escopo seguinte (`AUTH-HTTP-CREATE-USER`)
Adapter `invite-mailer.email.ts` (reusa EmailSender), wiring composition (gera `unusablePasswordHash` via
argon2 de randomBytes), e rota `POST /api/v1/users` (RBAC `user:create`, 409/422).
