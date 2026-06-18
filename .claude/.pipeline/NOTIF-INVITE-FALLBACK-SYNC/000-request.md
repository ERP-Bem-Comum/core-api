# NOTIF-INVITE-FALLBACK-SYNC — paridade de fallback do convite (igual ao reset)

> Corrige regressão de paridade introduzida em `NOTIF-INVITE-OUTBOX` (issue #136, reescopada).
> **Bug:** num deploy com provider de e-mail configurado mas **sem** `NOTIFICATIONS_DATABASE_URL`,
> o `reset-password` envia (fallback síncrono) mas `invite`/`collaborator-invite` caem em outbox
> **InMemory sem worker** → e-mail **preso, nunca enviado**. Como provisionar o DB de outbox é a
> issue #135 (ainda pendente), no curto prazo os convites silenciosamente não saem.

## Tamanho

**S** — alinhar 2 composition builders ao padrão já existente do reset. Sem schema, sem novo adapter.

## Causa-raiz

`buildResetMailer` (`auth/.../composition.ts:422-431`) tem fallback **síncrono real**:
`buildEmailSender(env)` + `makeEmailPasswordResetMailer`. Já `buildInviteMailer`
(`auth/.../composition.ts:474-479`) e `buildPartnersInviteMailer` (`partners/.../composition.ts`)
usam, no mesmo ponto, `makeOutbox*InviteMailer({ emailOutbox: InMemoryEmailOutbox().port })` — que sem
worker nunca envia (o próprio comentário admite "sem worker, o e-mail não sai").

## Decisão de design travada

Espelhar **exatamente** o fallback do reset nos 2 builders de convite:
- Caminho async (outbox Drizzle) quando `NOTIFICATIONS_DATABASE_URL` + remetente — **inalterado**.
- **Fallback síncrono** (substitui o InMemory): `buildEmailSender(env)` + `makeEmailInviteMailer`
  (auth) / `makeEmailCollaboratorInviteMailer` (partners). Provider inválido → boot falha; sem
  remetente → no-op SEGURO.
- Os adapters `invite-mailer.email.ts` e `collaborator-invite-mailer.email.ts` voltam a ser usados
  (deixam de ser "órfãos" — premissa original da #136 estava incorreta; `password-reset-mailer.email.ts`
  nunca foi órfão).

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — auth invite fallback síncrono.** Dado provider válido (ex.: `EMAIL_PROVIDER=smtp` + `SMTP_*`)
  e remetente, **sem** `NOTIFICATIONS_DATABASE_URL`, Quando `buildInviteMailer` resolve, Então o mailer
  resultante **envia via `EmailSender`** (não enfileira em InMemory).
- **CA2 — partners collaborator fallback síncrono.** Idem para `buildPartnersInviteMailer`
  (precedência `PARTNERS_INVITE_FROM` > `resolveFrom('invite')` preservada).
- **CA3 — paridade com reset.** O caminho de fallback do convite é equivalente ao do reset
  (mesma forma: `buildEmailSender` + adapter síncrono; boot falha em provider inválido; no-op sem remetente).
- **CA4 — async inalterado.** Com `NOTIFICATIONS_DATABASE_URL` + remetente, segue enfileirando no outbox Drizzle.
- **CA5 — sem regressão.** Testes existentes de invite/collaborator/reset seguem verdes.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**.
`invite-mailer.email.ts` e `collaborator-invite-mailer.email.ts` referenciados no wiring (não órfãos).
Fecha #136.
