[← Voltar para ADRs](./README.md)

# ADR-0046: Contrato de eventos de integração `contracts → partners` (`contractorRef` para read-model de contagem nos grids)

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** Gabriel (tech lead / arquiteto).
- **Origem:** Feature [`015-collaborator-complete-registration`](../../../specs/015-collaborator-complete-registration/) · **US6** (#46, contagem de contratos nos grids) do épico Colaborador (#65). É o **blocker** da US6 (tarefa T069): sem este contrato, `partners` não tem como contar contratos por contraparte sem ler as tabelas do `contracts` (proibido por ADR-0006).
- **Estende:** [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-models = projeções idempotentes sobre o outbox-as-log) · [ADR-0043](./0043-partners-supplier-integration-events.md) (molde do contrato de integração cross-módulo; Opção A — enriquecimento no adapter).
- **Relacionado:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox, at-least-once, atomicidade) · [ADR-0006](./0006-modular-monolith-core-api.md) (cross-módulo por eventos, nunca leitura cruzada de tabelas) · [ADR-0014](./0014-mysql-database-isolation.md) (prefixos `ctr_*`/`par_*`) · [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (payload `varchar`, sem JSON nativo).

---

## Contexto

A US6 (#46) precisa exibir, nos grids de parceiros, a **contagem de contratos por contraparte** (contractor). O read-model alvo é `par_contract_count_view` (`contractorRef → count`), local ao `partners` — sem consultar o `contracts` em runtime (ADR-0006).

Os eventos públicos do `contracts` ([`contracts/public-api/events.ts`](../../../src/modules/contracts/public-api/events.ts), wire-format v1) identificam o **contrato** (`ContractCreated`, `ContractEnded`, `ContractCancelled`, …) mas **não carregam a contraparte** (`contractorRef`). Sem esse campo, nenhum consumidor consegue agregar contratos por contraparte.

É a distinção clássica **evento de domínio** (interno ao BC `contracts`) vs **evento de integração** (contrato cross-fronteira) — Vernon, _Implementing DDD_, cap. "Domain Events" (mesma base do ADR-0043).

---

## Decisão

Fixar o contrato de integração `contracts → partners` e o padrão de projeção, espelhando ADR-0043 (contrato) + ADR-0022 (projeção). **Fatiado em duas etapas serializadas** (US6a produtor, US6b consumidor).

### 1. `contracts` enriquece o wire-format com `contractorRef` (Opção A — domínio intocado)

O `contractorRef` é adicionado ao **payload de outbox** dos eventos de ciclo de vida relevantes (`ContractCreated` + terminal `ContractEnded`/`ContractCancelled`), **montado no adapter de persistência a partir do snapshot do agregado** (Opção A do ADR-0043 — o evento de **domínio** não muda). É **aditivo ao wire-format v1**: consumidores existentes (ex.: projetor de Timeline interno) ignoram o campo novo; nenhum `schema_version` bump (ADR-0043 §"Decisão"; o decoder v1 já documenta "adicionar NUNCA quebra v1").

A exposição ao consumidor é via `contracts/public-api/` (ADR-0006) — `partners` lê `contractorRef` do contrato de integração, **nunca** das tabelas `ctr_*`.

### 2. Eventos no contrato de contagem

| `event_type`        | Efeito na contagem                        | No contrato? |
| ------------------- | ----------------------------------------- | :----------: |
| `ContractCreated`   | +1 contrato para `contractorRef`          |      ✅      |
| `ContractEnded`     | −1 (contrato deixa de ser vigente)        |      ✅      |
| `ContractCancelled` | −1 (contrato cancelado)                   |      ✅      |
| `ContractActivated` / `ContractStateUpdated` | não muda a contagem        |      ❌      |

> Semântica exata (contagem de **vigentes** vs total; tratamento de transições) é detalhe das specs 6a/6b; o contrato aqui fixa **quais eventos** carregam `contractorRef` e que `partners` **deriva** a contagem deles.

### 3. Payload (wire format, aditivo a `schema_version = 1`)

```jsonc
{
  // campos pré-existentes do evento de contrato…
  "contractRef": "uuid", // String(contract.id)
  "contractorRef": "uuid", // NOVO — String(contract.contractor) (snapshot do agregado)
  "occurredAt": "2026-06-17T12:00:00.000Z",
}
```

### 4. `partners` projeta `par_contract_count_view` (ADR-0022)

Read-model **derivado** por **projeção idempotente** sobre o event-delivery, em **worker dedicado** `src/workers/contract-count-projection/` (molde da feature 014 `supplier-view-projection`). Colunas decompostas (`contractor_ref varchar(36)`, `active_count int`) — sem JSON (ADR-0020). Truncável e **reconstruível** reprojetando o log (ADR-0022 §"Invariantes").

### 5. Garantias (herdadas de ADR-0015/0022/0043)

- **Atomicidade:** o evento de integração só existe se a escrita do contrato confirmou (mesma tx, `appendOutboxInTx`).
- **At-least-once + idempotência:** entrega pode repetir; a projeção é idempotente por `eventId` (ADR-0022 §"Invariantes"). Fundamento canônico:

> "De-duplication is a necessity in environments where a single message published through a messaging system could possibly be delivered to subscribers more than once. (…) Before subscribers can acknowledge that the messages were received and processed, they fail. (…) the messaging system delivers the unacknowledged messages again."
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 412 ("Event De-duplication").

---

## Fatiamento (desbloqueia a US6)

| Ticket | Módulo | Escopo |
| ------ | ------ | ------ |
| **US6a** `CTR-CONTRACT-EVENT-CONTRACTOR-REF` | `ctr_*` | adiciona `contractorRef` ao payload de outbox (Opção A) + expõe no `public-api`; aditivo ao wire-format v1 |
| **US6b** `PAR-CONTRACT-COUNT-READMODEL` | `par_*` | worker `contract-count-projection` + `par_contract_count_view` + leitura nos grids; **depende de 6a** |

---

## Alternativas rejeitadas

| Alternativa | Por que rejeitada |
| :--- | :--- |
| **Port síncrono `partners → contracts`** (query em runtime) | Ofende ADR-0006 (leitura cruzada); acopla os BCs; impede extração futura. |
| **Opção B — `contractorRef` no evento de domínio** | Toca o domínio do `contracts` por uma necessidade de integração; ADR-0043 já fixou Opção A como padrão (enriquecer no adapter). Reabrir só se 2+ consumidores exigirem o campo no domínio. |
| **`partners` lê `ctr_*` direto** | Proibido (ADR-0006/0014). |
| **Bump `schema_version` para v2** | Desnecessário — adicionar campo/variante é aditivo a v1 (decoder faz switch exaustivo). |

---

## Consequências

**Positivas:**

- `partners` conta contratos por contraparte sem ler o `contracts` (ADR-0006); read-model reconstruível (ADR-0022).
- Domínio do `contracts` intocado (Opção A); contrato versionado e aditivo (sem quebrar consumidores existentes).
- Reusa infra existente: outbox `ctr_*` (ADR-0015) + molde de projeção da feature 014.

**Negativas / trade-offs:**

- Novo write-path no adapter de outbox do `contracts` (montar `contractorRef` do snapshot) + novo worker no `partners`.
- A contagem é **eventualmente consistente** (projeção assíncrona) — aceitável para grids (não é saldo transacional).
- `partners` ganha dependência do contrato público do `contracts` (sentido único; aceitável — já é o padrão ADR-0043).

---

## Referências

- [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — read-models via projeção idempotente sobre o outbox-as-log.
- [ADR-0043](./0043-partners-supplier-integration-events.md) — molde do contrato de integração cross-módulo (Opção A).
- [ADR-0015](./0015-mysql-outbox-pattern.md) · [ADR-0006](./0006-modular-monolith-core-api.md) · [ADR-0014](./0014-mysql-database-isolation.md) · [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md).
- Vaughn Vernon, _Implementing Domain-Driven Design_, cap. "Domain Events" (domínio vs integração) e p. 412 ("Event De-duplication" — idempotência sob at-least-once).
