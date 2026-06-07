# AUTH-USECASE-CREATE-USER — Criar usuário (admin) + convite por email (US3)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US3, FR-005/006/007/016, tasks T028–T030) · **Branch:** `005-gestao-usuarios`

> **Design de segurança projetado pelo `security-backend-expert`** (ancorado no código real + OWASP ASVS).
> Este ticket = camada **domínio + application** (use case + evento + port + adapter de convite). A **rota
> HTTP** `POST /api/v1/users` é o ticket seguinte `AUTH-HTTP-CREATE-USER`.

## Decisões (do especialista)

1. **Credencial sem senha = placeholder unusable.** A criação injeta `unusablePasswordHash` (gerado no
   composition root via `argon2.hash(randomBytes(32))` descartado). **Não altera o agregado** (`passwordHash`
   continua não-nullable). `authenticate-user.verify(senha, unusableHash)` → `false` → `invalid-credentials`
   (sem vazar estado). Após o convite, `confirmPasswordReset` → `changePassword` substitui o placeholder.
   - **Rejeitado:** sentinel `'!unusable'` (vazaria erro `password-verify-failed` ≠ `invalid-credentials`).
   - **Rejeitado:** `passwordHash` nullable (cascata em authenticate/confirm/enable; risco de null-bypass).
2. **Convite dentro do use case** (fail-closed): valida → unicidade email → `User.create` → save → emite
   token de ativação (mesmo mecanismo do reset) → `inviteMailer.sendInvite(activationUrl)`. URL de **origem
   confiável** (`activationBaseUrl` da config, **nunca** header Host — anti Host-Header-Injection).
3. **Evento `UserCreated`** (novo): `{ type, userId, email, createdByAdminId, occurredAt }` — só metadados (DD-USER-05).
4. **Port `InviteMailer`** novo (ISP — template "boas-vindas/primeiro acesso" ≠ "reset de senha").
5. **Atomicidade:** sem rollback transacional. `spec.md:202` admite "usuário ativo sem credencial utilizável";
   reenvio de convite é ticket futuro (`resend-invite-by-admin`).
6. **Email duplicado revelado ao admin** = OK (ator autenticado + `user:create`; não é enumeração de endpoint público).

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `domain/identity/user/events.ts` — `UserCreated` + `UserEvent` |
| Modificar | `domain/identity/user/user.ts` — `CreateByAdminInput` + `User.create` + reexport |
| Criar | `application/ports/invite-mailer.ts` |
| Criar | `application/use-cases/create-user-by-admin.ts` |
| Criar | `adapters/notifications/invite-mailer.email.ts` (reusa `EmailSender`; template convite) |
| Criar (teste) | `tests/modules/auth/application/use-cases/create-user-by-admin.test.ts` |

## Critérios de aceite (W0 — testes de segurança do especialista)

- **CA1 (crítico)**: usuário criado por admin → `authenticateUser(email, qualquerSenha)` = `err('invalid-credentials')` (placeholder não autentica).
- **CA2**: convite enviado **exatamente 1×** com o email correto + URL não-vazia.
- **CA3**: URL de ativação começa com `activationBaseUrl` da config; **não** contém fragmento do command (anti-injection).
- **CA4**: email duplicado → `err('email-already-registered')` e `userRepo.save` **não** chamado.
- **CA5**: `inviteMailer` falha → `err('invite-mail-failed')`.
- **CA6/CA7**: validação — name vazio → `err('name-required')`; cpf/email/telefone inválidos → erro específico, sem side-effect.
- **CA8**: `UserCreated` emitido com `userId`/`createdByAdminId`/`email` corretos; **sem** passwordHash no payload.
- **CA9**: token de ativação persistido com `expiresAt = now + inviteTtlSeconds` e `userId` do novo usuário.
