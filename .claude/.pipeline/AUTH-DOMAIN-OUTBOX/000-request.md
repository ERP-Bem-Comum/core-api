# AUTH-DOMAIN-OUTBOX — outbox de eventos de domínio no `auth` (fundação do ADR-0047)

> Fatia **01** da implementação do [ADR-0047](../../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md)
> (e-mail transacional como evento de domínio no outbox do produtor). Resolve o pré-requisito: hoje o
> `auth` **não tem** outbox de eventos (o `partners` tem). Issue #134.

## Tamanho

**L** — primeiro outbox de eventos do `auth`: schema + migration + port + adapters + emissão atômica
nos use cases. Reusa a infra genérica `#src/shared/outbox` e o molde do `partners`.

## Objetivo

O `auth` passa a gravar **eventos de domínio** (`PasswordResetRequested`, `UserInvited`) no seu próprio
outbox **na MESMA transação** do save da operação de negócio (atomicidade, ADR-0015). Neste ticket é
**dark-launch**: os eventos são produzidos e acumulam; **nenhum consumidor** os processa ainda (isso é a
fatia 02, `NOTIF-EMAIL-EVENT-CONSUMER`). O envio de e-mail **continua** pelo caminho atual
(`notifications_email_outbox` / fallback síncrono) — **sem regressão**.

## Decisões de design travadas

1. **Schema `auth_outbox`** (prefixo do `auth`, ADR-0014) + migration **`0007`** (`auth` tem 0000-0006;
   numeração própria, **sem colisão**). Molde: `partners` `par_outbox` (schema + repo).
2. **Tipos canônicos** de `#src/shared/outbox` (`OutboxRow`, `WorkerOutboxOps`, etc.). Port `OutboxPort`
   do `auth` re-exporta os tipos de consumo (igual `partners/application/ports/outbox.ts`).
3. **`appendOutboxInTx(tx, schema, messages)`** — molde exato de
   `partners/.../outbox-repository.drizzle.ts:91`. O adapter Drizzle do `auth` grava save + evento na
   mesma `db.transaction(async (tx) => …)`. Adapters: InMemory (testes) + Drizzle.
4. **Eventos** (EN passado, idioma de eventos): `PasswordResetRequested`, `UserInvited`. Payload
   autocontido com o necessário para o e-mail (destinatário, link/token de uso único, nome). Wire-format
   `schema_version = 1`, payload `varchar`/`text` JSON (sem JSON nativo, ADR-0020).
5. **Emissão atômica nos use cases:**
   - `requestPasswordReset` (`request-password-reset.ts`): o save do reset-token e o append de
     `PasswordResetRequested` ocorrem na MESMA tx. Anti-enumeração preservada (só emite se a conta
     existe/ativa — espelha o early-return atual).
   - `createUserByAdmin` (`create-user-by-admin.ts`): save do user + invite-token + `UserInvited` na
     mesma tx.
6. **Dark-launch:** SEM worker/consumer neste ticket. SEM remover o caminho de envio atual. O corte
   (consumir o evento e aposentar o `notifications_email_outbox` como fila) é a fatia 02.
7. **Segurança:** o payload carrega link/token (sensível); outbox é interno (não cruza `public-api`
   pública, ADR-0006), **não logado**; expurgo pós-processamento fica para a fatia 02.

## Fora de escopo (fatias seguintes do ADR-0047)

- `NOTIF-EMAIL-EVENT-CONSUMER` (02): consumidor que entrega o evento → template → `EmailSender`;
  aposenta o `notifications_email_outbox`; corta o caminho de envio antigo.
- `PARTNERS-INVITE-DOMAIN-EVENT` (03): `CollaboratorInvited` no `par_outbox`.

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — schema + migration.** `auth_outbox` definido (prefixo `auth`, mapeamentos ADR-0020) e migration
  `0007` gerada (idempotente; `db:generate:auth` não-concorrente; sem colisão).
- **CA2 — reset emite na tx.** Dado um usuário existente e ativo, Quando `requestPasswordReset` roda,
  Então o reset-token e um `PasswordResetRequested` são gravados na MESMA transação (ambos ou nenhum).
- **CA3 — invite emite na tx.** Dado `createUserByAdmin`, Então user + invite-token + `UserInvited` na MESMA tx.
- **CA4 — anti-enumeração.** Dado e-mail inexistente/malformado/inativo no reset, Então **nenhum** evento
  é gravado (e a resposta segue 202).
- **CA5 — atomicidade real.** Dado falha no append do evento (ou no save), Então a transação inteira faz
  rollback (sem token órfão sem evento, nem evento órfão sem token).
- **CA6 — dark-launch sem regressão.** O envio de e-mail atual (notifications/fallback) continua
  funcionando; os testes existentes de reset/invite seguem verdes; nenhum consumidor é exigido.
- **CA7 — payload.** O evento carrega destinatário + link/token + nome; tratado como sensível (não logado).

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**, sem regressão.
Migration `0007` do `auth` versionada. Sem `npm` (ADR-0012). Cobertura: schema/mapper (unit) +
emissão atômica nos use cases (integração com repo Drizzle ou InMemory transacional) + anti-enumeração.
