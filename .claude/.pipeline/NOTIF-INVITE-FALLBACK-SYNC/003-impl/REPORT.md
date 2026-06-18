# W1 — Implementação GREEN · NOTIF-INVITE-FALLBACK-SYNC

> Outcome: **GREEN** · 7/7 novos verdes · suíte 2818 testes, 0 fail

## Alterados
- `src/modules/auth/adapters/http/composition.ts` — `buildInviteMailer` exportado, com seam opcional
  `emailSender?` (usado só em teste). Fallback InMemory outbox → **síncrono**
  (`buildEmailSender` + `makeEmailInviteMailer`). Provider inválido → throw; sem remetente → no-op seguro.
- `src/modules/partners/adapters/http/composition.ts` — `buildPartnersInviteMailer` idem com
  `makeEmailCollaboratorInviteMailer`; precedência `PARTNERS_INVITE_FROM > resolveFrom('invite')` preservada.

Caminho async (Drizzle) inalterado. Nenhum `.email.ts` removido; `password-reset-mailer.email.ts` intocado.
`invite-mailer.email.ts` (auth:92,484) e `collaborator-invite-mailer.email.ts` (partners:82,223) **religados**.

> Desvios de fixture corrigidos em W0/W1 (não eram bug de produção): VO `EmailAddress` rejeita
> `"Nome <addr>"` (exige `local@domain.tld`); `CollaboratorInviteMailer` usa `autocadastroUrl` (não `activationUrl`).
