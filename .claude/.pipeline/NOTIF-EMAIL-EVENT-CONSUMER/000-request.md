# NOTIF-EMAIL-EVENT-CONSUMER — consumidor de eventos de e-mail (ADR-0047 fatia 02)

> Fatia **02** do [ADR-0047](../../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md).
> A fatia 01 (`AUTH-DOMAIN-OUTBOX`) já emite `PasswordResetRequested`/`UserInvited` no `auth_outbox` na tx do
> save. Esta fatia **liga o consumidor** (envio real pelo novo caminho) e **desliga o caminho atual** — sem
> duplicar e-mail. **Limpeza de código morto + DROP da tabela = fatia 02b** (fora de escopo). Issue #134.

## Tamanho

**L** — helpers de worker no `auth_outbox` + contrato de eventos no `auth/public-api` + consumidor/templates
no `notifications` + worker dedicado + corte do caminho antigo nos use cases.

## Decisões de design travadas (recorte: liga+desliga, limpeza depois)

1. **Helpers de worker no `auth_outbox` Drizzle** (`auth/.../repos/outbox-repository.drizzle.ts`): adicionar
   `withPendingBatch` / `markProcessed` / `markFailed` / `moveToDeadLetter` (a fatia 01 só fez `append`/`appendOutboxInTx`).
   Molde EXATO: `partners/.../outbox-repository.drizzle.ts`. Usa `FOR UPDATE SKIP LOCKED` (ADR-0015/0041).
2. **Contrato de eventos via `auth/public-api`**: expor os tipos/decoder de `PasswordResetRequested` /
   `UserInvited` (wire-format `schema_version=1`, payload autocontido: destinatário, link/token, nome), espelhando
   `contracts/public-api/events.ts`. O `notifications` consome **só** via `public-api` (ADR-0006).
3. **Consumidor no `notifications`**: `EventDelivery` que recebe o evento decodificado → mapeia `eventType` →
   **template** (texto/HTML; migram dos mailers atuais, incl. `escapeHtml`) → `EmailMessage` → `EmailSender.send`
   (provider resolvido por `buildEmailSender(env)` — `NOTIF-EMAIL-DEPLOY-CONFIG`). Templates passam a viver no
   consumidor (ADR-0010 §"templates na application layer").
4. **Worker dedicado** `src/workers/email-dispatch/` (molde `src/workers/supplier-view-projection`): abre o pool do
   `auth` (lê `auth_outbox`), instancia `EmailSender` + o `EventDelivery` do `notifications`, roda `runLoop`
   (`#src/shared/outbox`) com retry/backoff/DLQ. Script `worker:email-dispatch`. (Multi-produtor — `par_outbox`/
   `CollaboratorInvited` — é a fatia 03.)
5. **Desligar o caminho antigo (sem duplicar):** `requestPasswordReset` e `createUserByAdmin` **param de chamar**
   `mailer.sendResetLink`/`inviteMailer.sendInvite` (o evento já é emitido na tx pela fatia 01; o envio vem do
   consumidor). Remover a chamada e a dependência `mailer` desses use cases; o composition para de montá-los.
6. **NÃO remover ainda** (fica para 02b): os adapters de mailer (`*.outbox.ts`/`*.email.ts`), o port `EmailOutbox`
   e o `notifications_email_outbox` (código + tabela). Ficarão **órfãos** após esta fatia — registrado como 02b.
   **NÃO** dropar a tabela `notifications_email_outbox` nesta fatia (drop = migration destrutiva, só após confirmar
   ausência de pendentes).

## Fora de escopo

- **02b** `NOTIF-EMAIL-OUTBOX-RETIRE`: remover mailers órfãos + port `EmailOutbox` + `notifications_email_outbox`
  (código) + migration de DROP da tabela. (Abrir issue ao fechar esta fatia.)
- **03** `PARTNERS-INVITE-DOMAIN-EVENT`: `CollaboratorInvited` no `par_outbox` + consumidor lê também o `par_outbox`.

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — claim.** `auth_outbox` Drizzle expõe `withPendingBatch`/`markProcessed`/`markFailed`/`moveToDeadLetter`;
  o worker genérico claim-a um batch pendente (`SKIP LOCKED`).
- **CA2 — contrato.** `auth/public-api` expõe decoder de `PasswordResetRequested`/`UserInvited`; payload corrupto → erro tratável.
- **CA3 — reset enviado.** Dado um `PasswordResetRequested` pendente, Quando o worker roda, Então monta o e-mail de
  reset (template + link) e chama `EmailSender.send`; sucesso → `markProcessed`.
- **CA4 — invite enviado.** Idem para `UserInvited` (template de convite).
- **CA5 — sem duplicação.** `requestPasswordReset`/`createUserByAdmin` **não** chamam mais o mailer; o e-mail sai
  **só** pelo consumidor (verificável: nenhuma chamada síncrona de envio nos use cases).
- **CA6 — retry/DLQ.** Falha do `EmailSender` → `markFailed` (segue pendente); `>= maxAttempts` → dead-letter.
- **CA7 — anti-enumeração + sem regressão.** Conta inexistente → nenhum evento → nenhum e-mail; testes de
  reset/invite ajustados ao novo fluxo (emite evento; não chama mailer) seguem verdes.
- **CA8 — templates.** Conteúdo (subject/texto/HTML/link) equivalente ao atual; `escapeHtml` preservado.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem regressão.
Sem `npm` (ADR-0012). Worker `email-dispatch` com entrypoint + config por env. Código morto da fatia 02b
**não** removido aqui, mas **inerte** (não referenciado no fluxo de envio).
