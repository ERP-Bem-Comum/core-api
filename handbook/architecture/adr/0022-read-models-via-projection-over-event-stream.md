[← Voltar para ADRs](./README.md)

# ADR-0022: Read-Models via Projeção sobre o Event Stream (Timeline agora, AuditLog diferido)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Decide:** [Inquiry-0017](../../inquiries/0017-timeline-read-model-vs-adr-0020.md) (Timeline) + [Inquiry-0018](../../inquiries/0018-auditlog-transversal-todos-bcs.md) (AuditLog)
- **Relacionado:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (MySQL único, JSON proibido), [ADR-0006](./0006-modular-monolith-core-api.md) (isolamento de módulos), [ADR-0014](./0014-mysql-database-isolation.md) (prefixos `ctr_*`/`fin_*`)

---

## Contexto

Duas capacidades documentadas no handbook seguiam sem implementação e sem decisão de _onde os dados são lidos_:

- **Timeline / Memória Operacional** ([`domain/contratos/05-timeline-context.md`](../../domain/contratos/05-timeline-context.md)) — trilha cronológica por contrato (UC-02 mostrar contrato + trilha; UC-08 ler trilha).
- **`AuditLogGenerated`** ([`domain/contratos/06-event-line-context.md:24`](../../domain/contratos/06-event-line-context.md)) — trilha transversal "Quem/Quando/De/Para".

Duas restrições pesavam:

1. **ADR-0020 proíbe coluna JSON.** O `metadata: JSON` do `EventoTimeline` documentado não pode ser persistido como está.
2. **AuditLog é transversal** (todos os BCs), o que conflita com o isolamento de módulos (ADR-0006/0014), e seu "Quem" exige **ator autenticado** — inexistente (não há RBAC; só o VO `user-ref`).

### Achado decisivo (inspeção do código, 2026-05-26)

O outbox (ADR-0015) **retém** as entradas após a entrega: o worker faz `markProcessed` (seta `processedAt`), **não** deleta; há índice `ctr_outbox_processed_at_occurred_at_idx` e tabela `ctr_outbox_dead_letter`. O `payload` é `VARCHAR` serializado (nunca JSON — ADR-0020).

> Conclusão: o **`ctr_outbox` já é um log append-only ordenado e retido de eventos de domínio**. Não há necessidade de um event-store novo.

---

## Decisão

1. **O outbox é o log append-only canônico de eventos de domínio.** Não criar uma tabela de event-store separada (seria redundante com o que o outbox já é).

2. **Read-models são PROJEÇÕES sobre o stream de eventos**, alimentadas pelo **caminho de event-delivery já existente** (worker → `EventDelivery` → handler projetor). Nunca derivadas por query direta na tabela de entrega.
   - Colunas **decompostas e tipadas** por tipo de evento (sem JSON — ADR-0020). A narrativa humana usa `descricao` textual; o "metadata" rico é derivado do payload tipado do evento (ex.: `ContractStateUpdated` já carrega `newCurrentValue`/`newCurrentPeriod`).
   - Projetores são **idempotentes** (reprocessar um evento não duplica linha — chave por `eventId`).
   - O read-model é **derivado**: pode ser truncado e **reconstruído** reprocessando o log.

3. **Timeline (Inquiry-0017): implementar agora.** Projeção por contrato em tabela `ctr_timeline_*` (dentro do módulo contracts, prefixo `ctr_`). UC-02 passa a devolver contrato + trilha; UC-08 lê a trilha. Ordenação por `occurredAt`. Append-only (R1 da timeline).

4. **AuditLog (Inquiry-0018): mesmo padrão de projeção, transversal, mas DIFERIDO até identidade/RBAC.** Decidido o _padrão_ (projeção transversal, fora dos prefixos de módulo); a materialização de "Quem/De/Para" espera a estratégia de identidade — sem ator autenticado, auditoria é de fachada. Reabrir quando RBAC existir.

---

## Alternativas rejeitadas

| Alternativa | Por que rejeitada |
| :--- | :--- |
| **Derivar on-read direto do outbox** | Acopla a leitura à tabela de _entrega_; `payload` é VARCHAR serializado (consulta ruim); auditoria transversal exigiria unir N outboxes de módulos (ofende isolamento). |
| **Event-store dedicado (novo, escrito pelos repos)** | Redundante — o outbox já é o log append-only retido. Duplicaria write-path e dado. |
| **Persistir `metadata` como JSON** | Proibido por ADR-0020. |

---

## Consequências

**Positivas:**
- Reusa o log que já existe (outbox) como fonte de verdade do stream; zero novo write-path de domínio.
- Read-models reconstruíveis (resiliência: reprojetar a partir do log).
- Respeita ADR-0020 (colunas decompostas) e ADR-0006/0014 (Timeline em `ctr_*`; AuditLog transversal só quando houver RBAC).

**Negativas / custos:**
- Novo componente: **projetor** consumindo o event-delivery (idempotente, com posição/checkpoint).
- Timeline duplica informação que está nos eventos (aceitável — é a natureza de um read-model CQRS).
- AuditLog segue ausente até a decisão de identidade/RBAC.

**Disparado:**
- Ticket `CTR-TIMELINE-READ-MODEL` (W0→W3): schema `ctr_timeline_*`, projetor, queries UC-02/UC-08.
- Pré-requisito do AuditLog: inquiry/ADR de **identidade & RBAC**.

---

## Invariantes normativas

- Projeção é **idempotente** por `eventId` (reprocesso não duplica).
- Projeção é **derivada** — nunca fonte de verdade; pode ser truncada e reconstruída do outbox.
- Timeline é **append-only** (R1, `05-timeline-context.md:95`); correção via evento de retificação, nunca update/delete.
- Sem JSON nativo (ADR-0020) — colunas decompostas por tipo de evento.
