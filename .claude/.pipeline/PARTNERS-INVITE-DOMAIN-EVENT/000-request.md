# PARTNERS-INVITE-DOMAIN-EVENT — convite de colaborador via outbox de e-mail (ADR-0047 fatia 03)

> Fatia **03** (final) do [ADR-0047](../../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md).
> Migra o convite de colaborador (`issueCollaboratorInvite`) do envio atual para **evento de domínio +
> consumidor**, fechando o ADR para todos os produtores. Issue #134.

## Decisão de modelagem travada (refina o ADR-0047)

O `par_outbox` é **single-consumer destrutivo** (`markProcessed` global) e já é consumido pelo
`supplier-view-projection` (→ `financial`). Colocar `CollaboratorInvited` nele canibalizaria esse consumidor.
**Decisão:** o `partners` ganha um **outbox de e-mail dedicado `par_email_outbox`** (single-consumer: só o
`email-dispatch`), análogo ao `auth_outbox` da fatia 01. O `par_outbox` (integração) fica intocado.

## Tamanho

**L** — 2º outbox no `partners` (schema + migration + helpers de worker) + evento + emissão atômica +
consumidor multi-fonte no `email-dispatch` + corte do caminho antigo.

## Decisões de design travadas

1. **`par_email_outbox`** (prefixo `par_`, ADR-0014) + migration **`0016`** (`partners` vai até 0015;
   numeração própria, sem colisão; `db:generate:partners` não-concorrente). Molde: `auth_outbox` (fatia 01) —
   já inclui `append`/`appendOutboxInTx` **e** os helpers de worker (`withPendingBatch`/`markProcessed`/
   `markFailed`/`moveToDeadLetter`, claim `SKIP LOCKED`), pois esta tabela é consumida desde já.
2. **Evento `CollaboratorInvited`** (EN passado; `aggregateType` `Collaborator`); payload autocontido
   (email, autocadastroUrl, recipientName); wire-format `schema_version=1`, payload `varchar`/`text` JSON
   (sem JSON nativo, ADR-0020).
3. **Emissão atômica:** em `issue-collaborator-invite.ts`, o save do invite-token e o append de
   `CollaboratorInvited` ocorrem na MESMA tx (espelha o `saveWithEvents` do auth; o adapter coordena a tx).
4. **`partners/public-api`** expõe o decoder/tipos de `CollaboratorInvited` (consumido pelo `email-dispatch`, ADR-0006).
5. **Consumidor multi-fonte no `email-dispatch`:** o worker passa a ler **`auth_outbox` + `par_email_outbox`**
   (abre os 2 pools — `AUTH_DATABASE_URL` + `PARTNERS_DATABASE_URL`; dois `runLoop` concorrentes com o **mesmo**
   `EventDelivery` de e-mail). O delivery ganha o caso `CollaboratorInvited` → template de autocadastro
   (texto/HTML com `escapeHtml`, equivalente ao atual).
6. **Desligar o antigo:** `issueCollaboratorInvite` **para de chamar** `mailer.sendInvite` (o evento já é
   emitido na tx; envio pelo consumidor). A rota que compõe o use case deixa de montar o mailer.

## Fora de escopo

- Limpeza do código morto (mailers/`EmailOutbox`/`notifications_email_outbox` + DROP) — já é a **fatia 02b** (#151).
  Após esta fatia, o `collaborator-invite-mailer.*` também entra na lista de órfãos da #151.

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — schema + migration.** `par_email_outbox` (prefixo `par_`, ADR-0020) + migration `0016` (idempotente, sem colisão).
- **CA2 — emite na tx.** Dado `issueCollaboratorInvite`, Então invite-token + `CollaboratorInvited` na MESMA tx (ambos ou nenhum).
- **CA3 — contrato.** `partners/public-api` decodifica `CollaboratorInvited`; payload corrupto → erro tratável.
- **CA4 — enviado.** Dado um `CollaboratorInvited` pendente, Quando o `email-dispatch` roda, Então monta o e-mail
  de autocadastro (template + link) e chama `EmailSender.send`; sucesso → `markProcessed`.
- **CA5 — sem duplicação.** `issueCollaboratorInvite` **não** chama mais o mailer; o e-mail sai só pelo consumidor.
- **CA6 — retry/DLQ.** Falha do `EmailSender` → `markFailed` (segue pendente); `>= maxAttempts` → dead-letter.
- **CA7 — auth_outbox intacto.** O `email-dispatch` segue processando `PasswordResetRequested`/`UserInvited` do `auth_outbox` (multi-fonte).
- **CA8 — sem regressão + atomicidade.** Rollback conjunto; testes existentes do convite ajustados ao novo fluxo seguem verdes.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem regressão.
Migration `0016` do `partners` versionada. Sem `npm` (ADR-0012). `email-dispatch` consome 2 outboxes.
