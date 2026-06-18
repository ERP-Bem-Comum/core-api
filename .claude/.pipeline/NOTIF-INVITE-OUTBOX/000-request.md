# NOTIF-INVITE-OUTBOX — convites (invite + collaborator-invite) via outbox

> Origem: issue **#117** (follow-up de código). Completa a migração de envio síncrono → outbox,
> espelhando o piloto `reset-password` já entregue em `NOTIF-EMAIL-OUTBOX`.

## Tamanho

**M** — 2 adapters novos (espelho do piloto) + rewire de 2 composition roots. Sem schema novo
(reusa `notifications_email_outbox`).

## Objetivo

Os mailers de convite passam a **enfileirar** no `EmailOutbox` em vez de enviar síncrono; o worker
(`notifications/worker`) faz o envio real com retry/backoff. Hoje ainda são síncronos:
- **Auth invite:** `buildInviteMailer` (`auth/.../composition.ts:435`) usa `makeEmailInviteMailer` (síncrono).
- **Partners collaborator-invite:** `buildPartnersInviteMailer` (`partners/.../composition.ts:163`) usa
  `makeEmailCollaboratorInviteMailer` (síncrono).

## Decisões de design travadas

1. **Espelhar `makeOutboxPasswordResetMailer`** (`auth/.../password-reset-mailer.outbox.ts`):
   - `makeOutboxInviteMailer({ emailOutbox, from }): InviteMailer` (auth).
   - `makeOutboxCollaboratorInviteMailer({ emailOutbox, from }): CollaboratorInviteMailer` (partners).
   - Recebem `EmailOutbox` (de `notifications/public-api`) e chamam `enqueue(message, idempotencyKey)`.
2. **`idempotencyKey`** derivada do token no `activationUrl`/`autocadastroUrl` (igual ao reset, que deriva
   de `token=`); fallback UUID. Prefixo `invite:` / `collab-invite:`.
3. **Templates preservados** — texto/HTML/subject idênticos aos adapters síncronos atuais, incluindo
   `escapeHtml` (anti-XSS) no `recipientName`. NÃO logar link/corpo (token de uso único).
4. **Rewire dos composition roots** (espelho exato do reset): outbox real quando driver `mysql`
   (`createDrizzleEmailOutbox`) e InMemory outbox quando `memory`; **fallback no-op SEGURO** mantido
   (boot dev sem SMTP não quebra). Precedência de remetente preservada: `PARTNERS_INVITE_FROM` >
   `resolveFrom('invite')` no partners; `resolveFrom('invite')` no auth.
5. **Preservar** `makeCapturingCollaboratorInviteMailer` (mailer de teste do partners) e o comportamento
   dos use cases consumidores.

## Fora de escopo (issues próprias)

- Observabilidade por e-mail / bounce (webhook), rate-limit por destinatário, atomicidade total do
  enqueue — registrados como issues GitHub (dependem de decisão/ADR/infra).

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — auth invite enfileira.** Dado um `EmailOutbox`, Quando `InviteMailer.sendInvite` roda, Então a
  mensagem é enfileirada (sem envio síncrono) com `idempotencyKey` derivada do token.
- **CA2 — partners collaborator enfileira.** Idem para `CollaboratorInviteMailer.sendInvite`.
- **CA3 — template preservado.** A mensagem enfileirada mantém subject, corpo texto/HTML e o link de
  ativação/autocadastro.
- **CA4 — duplicata = no-op.** Reenfileirar o mesmo convite (mesma key) retorna sucesso sem 2ª linha.
- **CA5 — fallback seguro.** Driver `memory` sem remetente → no-op seguro; boot não quebra.
- **CA6 — sem regressão.** `createUserByAdmin` (auth) e autocadastro de colaborador (partners) seguem verdes.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem regressão.
Sem `npm` (ADR-0012).
