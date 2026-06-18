[← Voltar para ADRs](./README.md)

# ADR-0047: E-mail transacional como evento de domínio no outbox do módulo produtor (atomicidade do disparo)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Gabriel (tech lead / arquiteto) — opção **(c)** ratificada em 2026-06-18.
- **Origem:** issue [#134](https://github.com/ERP-Bem-Comum/core-api/issues/134) (atomicidade do enqueue de e-mail), follow-up de [#117](https://github.com/ERP-Bem-Comum/core-api/issues/117). Decorre dos tickets `NOTIF-EMAIL-OUTBOX` / `NOTIF-INVITE-OUTBOX` / `NOTIF-INVITE-FALLBACK-SYNC`.
- **Estende:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox, atomicidade na mesma transação, at-least-once) · [ADR-0010](./0010-email-port-adapter-pattern.md) (Email Port/Adapter; `EmailSender` único contrato).
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (cross-módulo por eventos, nunca chamada/leitura cruzada) · [ADR-0014](./0014-mysql-database-isolation.md) (isolamento por prefixo/pool) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (idempotência por `eventId` sob at-least-once) · [ADR-0043](./0043-partners-supplier-integration-events.md) (molde de evento de integração) · issue [#127](https://github.com/ERP-Bem-Comum/core-api/issues/127) (mesmo problema de atomicidade no `financial`).

---

## Contexto

Hoje o disparo de e-mail transacional (reset de senha, convite, autocadastro) é uma **chamada cross-módulo best-effort pós-save**: o use case do produtor (`auth`, `partners`) salva a operação de negócio e **depois** chama `EmailOutbox.enqueue` do `notifications` (`NOTIF-EMAIL-OUTBOX`). Se a operação commitou mas o enqueue falhou, **o e-mail não sai** — janela de inconsistência. O usuário pode repetir (reset/convite são re-solicitáveis), mas a garantia "o e-mail só dispara se a operação de negócio confirmou, e **sempre** que confirmou" não existe.

A atomicidade real exigiria gravar a intenção de e-mail na **mesma transação** do save. Mas a tabela `notifications_email_outbox` vive no **pool do `notifications`**, enquanto o save acontece no pool do `auth`/`partners` — escrever cross-pool na mesma transação **fura o ADR-0014** (isolamento). É a distinção canônica entre **evento de domínio** (fato interno ao BC, na mesma transação do agregado) e **efeito colateral de integração**:

> "Domain Events are a fully-fledged part of your domain model (…). When something happens in the domain model that other parts of the model (…) must be aware of, a Domain Event is published." — Vaughn Vernon, _Implementing Domain-Driven Design_, cap. "Domain Events".

O envio do e-mail é justamente um **consumidor** desse fato — não deve ser uma dependência síncrona do produtor.

## Decisão

E-mails transacionais disparados por uma operação de negócio são modelados como **evento de domínio do módulo produtor**, gravado no **outbox do próprio produtor, na MESMA transação** do save (atomicidade via ADR-0015, `appendOutboxInTx`). O módulo **`notifications` consome** esse evento (event-delivery, ADR-0006) e realiza o envio real através do `EmailSender` (ADR-0010), com retry/idempotência herdados do outbox.

### 1. O produtor emite o evento na sua transação

Ex.: `auth` grava `PasswordResetRequested` no **outbox do `auth`** na mesma transação do save do reset-token. `partners` grava `CollaboratorInvited` no `par_outbox`. Atomicidade garantida: o evento existe **se e somente se** a operação confirmou.

### 2. `notifications` é consumidor, não dependência síncrona

Um consumer (worker dedicado, molde da feature 014 / ADR-0045) entrega o evento ao `notifications`, que mapeia **tipo de evento → template** (templates ficam no consumidor — ADR-0010 §"O que NÃO entra no port") e envia via `EmailSender` resolvido por deploy (`buildEmailSender`, `NOTIF-EMAIL-DEPLOY-CONFIG`).

### 3. Consequência estrutural: cada produtor precisa de outbox de eventos

`partners` já tem (`par_outbox`). **`auth` ainda NÃO tem** — ganhará um outbox de eventos de domínio (molde `partners`). É o maior custo desta decisão.

### 4. Outbox único (recomendado): o do produtor

O retry/at-least-once passa a vir do **outbox do produtor**. O `notifications_email_outbox` (criado em `NOTIF-EMAIL-OUTBOX`) torna-se **redundante como fila** e é candidato a **aposentadoria** — o `notifications` vira o *tradutor evento→envio*, sem 2º outbox. Reusa-se sem desperdício: `EmailSender`/adapters, `buildEmailSender` (config por deploy), templates e o worker genérico `#src/shared/outbox` continuam valendo. (Manter um 2º outbox de envio é possível, mas duplica garantias — rejeitado salvo necessidade.)

### 5. Invariantes herdadas

- **Atomicidade:** evento ⟺ commit da operação (ADR-0015, mesma tx).
- **At-least-once + idempotência por `eventId`** no consumidor (ADR-0022 §"Invariantes"; Vernon, p. 412).
- **Anti-enumeração preservada:** o produtor só emite o evento quando a conta existe/está ativa (mantém o comportamento atual do `requestPasswordReset`).
- **Segurança do payload:** o evento carrega o link/token de uso único (origem confiável montada pelo produtor). O outbox é **interno** (não cruza `public-api` pública, ADR-0006) e **não logado**; TTL curto e expurgo pós-processamento recomendados (o token também vive como hash na tabela de reset).

## Alternativas rejeitadas

| Alternativa | Por que rejeitada |
| :--- | :--- |
| **(a) Best-effort pós-save** (status quo) | Janela de inconsistência (commit sem e-mail). Mantida apenas como **interino** até este ADR ser implementado. |
| **(b) Unit-of-work cross-pool** (enqueue no pool do `notifications` na tx do produtor) | Fura o isolamento do **ADR-0014**; acopla pools; impede extração futura do módulo. |
| **Chamada síncrona `produtor → notifications`** | Acopla os BCs em runtime (ADR-0006); não é atômica; falha do SMTP derruba a operação de negócio. |
| **Manter 2 outboxes** (produtor + `notifications_email_outbox`) | Duplica retry/idempotência sem ganho; mais superfície de falha. |

## Consequências

**Positivas:**

- **Atomicidade real:** o e-mail dispara se e só se a operação de negócio confirmou (ADR-0015) — fecha #134.
- **Desacoplamento:** `notifications` passa a ser consumidor de eventos de domínio — mesmo padrão já usado em `fin_supplier_view` (ADR-0045) e `par_contract_count_view` (ADR-0046). Falha do SMTP nunca afeta a operação de negócio.
- Reusa infra: `EmailSender`/config-por-deploy/templates/worker genérico permanecem.

**Negativas / trade-offs:**

- **`auth` ganha outbox de eventos de domínio** (não tem hoje) — custo de implementação real.
- O `notifications_email_outbox` recém-criado vira **redundante** (aposentadoria planejada) — retrabalho parcial, porém os adapters/config são reaproveitados.
- Mais um hop (evento → consumer → envio); a entrega é **eventualmente consistente** (já era, com o outbox).
- Mesmo padrão deveria endereçar #127 (`financial`) — oportunidade de unificar, fora do escopo deste ADR.

## Fatiamento proposto (após ratificação)

| Ticket | Módulo | Escopo |
| :--- | :--- | :--- |
| `AUTH-DOMAIN-OUTBOX` | `auth` | Outbox de eventos de domínio no `auth` (molde `partners`) + eventos `PasswordResetRequested`/`UserInvited` emitidos na tx do save. |
| `NOTIF-EMAIL-EVENT-CONSUMER` | `notifications` | Consumer dos eventos de e-mail (auth + partners) → template → `EmailSender`; aposenta `notifications_email_outbox` como fila. |
| `PARTNERS-INVITE-DOMAIN-EVENT` | `partners` | `CollaboratorInvited` no `par_outbox` na tx do autocadastro. |

> Interino até lá: best-effort atual (alternativa (a)) — já em produção, com o fallback síncrono corrigido em `NOTIF-INVITE-FALLBACK-SYNC`.

## Referências

- [ADR-0015](./0015-mysql-outbox-pattern.md) — outbox, atomicidade na mesma transação, at-least-once.
- [ADR-0010](./0010-email-port-adapter-pattern.md) — Email Port/Adapter; templates na application layer.
- [ADR-0006](./0006-modular-monolith-core-api.md) · [ADR-0014](./0014-mysql-database-isolation.md) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) · [ADR-0043](./0043-partners-supplier-integration-events.md) · [ADR-0045](./0045-financial-supplier-read-model.md).
- Vaughn Vernon, _Implementing Domain-Driven Design_, cap. "Domain Events" e p. 412 ("Event De-duplication" — idempotência sob at-least-once).
