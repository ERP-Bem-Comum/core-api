# W0 — Testes RED · CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a)

**Agente:** tdd-strategist · **Outcome:** RED · Decidido por ADR-0046 (Accepted).

## Âncora RED

`tests/modules/contracts/adapters/persistence/outbox-contractor-ref.test.ts` — **FAIL** (pass 0, fail 1) por export inexistente:

```
SyntaxError: ... does not provide an export named 'contractEventsToOutboxInserts'
```

`contractEventsToOutboxInserts` (mapper) e `decodeContractContractorRefV1` (public-api) não existem — RED pelo motivo certo (feature ausente), padrão do projeto.

## Design (confirmado no grounding)

**Opção A do ADR-0046 se sustenta** — o `contract-repository.drizzle.ts` `save(contract, events)` (linha 315) **tem o agregado em escopo** ao chamar `appendOutboxInTx(tx, schema, events)`. Então o enriquecimento mora no adapter (repo→mapper), espelhando `partners/.../supplier-outbox.mapper.ts` (feature 013/ADR-0043). **Domínio, evento e decoder de domínio intocados.**

- `contractEventsToOutboxInserts(events, contractor, now, idGen)` estampa `contractorRef` (`{ type, id }`) nos payloads de `ContractCreated`/`ContractCancelled`/`ContractEnded` — **aditivo a `OUTBOX_SCHEMA_VERSION=1`** (sem bump).
- `decodeContractContractorRefV1(row)` no `public-api/events.ts` expõe `{ contractRef, contractorRef, occurredAt }` ao consumidor (null p/ eventos sem contraparte). O decoder de domínio (`outboxRowToEvent`) ignora o campo extra (retrocompat, como `terminationReason`).

## Citação canônica (Princípio IX — ACDG via MCP `acdg-skills`)

> "An idempotent operation is one that can be executed two or more times in succession with results identical to those of executing the same operation only once. One way to deal with the possibility of duplicate message delivery is for subscriber model operation to be idempotent. (…) the receiver can be designed to refuse to execute an operation in response to a duplicate message. (…) your receiver will need to track which messages have already been handled (…) the unique message ID of all handled messages."
> — Vaughn Vernon, *Implementing Domain-Driven Design*, p. 412 ("An Idempotent Operation").

**Aplicação:** o evento de integração que a US6a produz é entregue **at-least-once** (ADR-0015); o consumidor de contagem (US6b) o aplica **idempotentemente por `eventId`** (ADR-0022). `contractorRef` referencia o contratado **por identidade** (Vernon, IDDD, p.460 — já citado em `contractor.ts`), nunca compondo o objeto rico do outro BC (FR-012/ADR-0032).

## CAs (US6a)
CA1 (`ContractCreated` → `contractorRef`, v1 preservado, sem bump) · CA2 (`ContractCancelled`/`ContractEnded` idem) · CA3 (`public-api` expõe ao consumidor; sem contraparte → null) · CA4 (retrocompat: `outboxRowToEvent` ignora o campo extra).

## Escopo (anti-padrão #4)
Somente `ctr_*`. NÃO tocar `par_*` (a projeção é a US6b).
