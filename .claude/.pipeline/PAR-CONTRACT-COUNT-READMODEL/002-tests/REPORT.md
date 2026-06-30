# W0 — Testes RED · PAR-CONTRACT-COUNT-READMODEL (US6b)

**Agente:** tdd-strategist · **Outcome:** RED · Decidido por ADR-0046; depende da US6a (closed-green). Fecha a feature 015.

## Âncora RED

`tests/modules/partners/application/contract-count-projection.test.ts` — **FAIL** (pass 0, fail 1) por módulo inexistente:

```
ERR_MODULE_NOT_FOUND: Cannot find module '...repos/contract-count-store.in-memory.ts'
```

`applyContractCountEvent` (partners/public-api) e `makeInMemoryContractCountStore` (adapter) não existem — RED pelo motivo certo.

## Design (espelha feature 014 `supplier-view-projection`, com 1 diferença crítica)

Worker no composition root (`src/workers/contract-count-projection/`) lê o `ctr_outbox` → `EventDelivery` chama `applyContractCountEvent({ store })(message)` (partners/public-api), que **decodifica via `contracts/public-api` `decodeContractContractorRefV1`** (US6a — NUNCA lê `ctr_*`, ADR-0006) e aplica o delta no `ContractCountStore`.

**Diferença vs feature 014:** lá a projeção é **snapshot** (upsert com recency-guard por `occurredAt`). Aqui é **delta (+1/−1)** — não idempotente sob recency. A idempotência é por **`eventId`**: o store registra os eventIds já aplicados e recusa duplicatas.

## Citação canônica (Princípio IX — ACDG via MCP `acdg-skills`)

> "One way to deal with the possibility of duplicate message delivery is for subscriber model operation to be idempotent. (…) When domain object idempotence is not a viable option, you can instead design the subscriber/receiver itself to be idempotent. The receiver can be designed to refuse to execute an operation in response to a duplicate message. (…) your receiver will need to track which messages have already been handled (…) the unique message ID of all handled messages."
> — Vaughn Vernon, *Implementing Domain-Driven Design*, p. 412 ("An Idempotent Operation").

**Aplicação:** a contagem (delta) **não** é naturalmente idempotente → o receiver (`ContractCountStore.applyDelta`) deduplica por `eventId` (CA2). O read-model é derivado/reconstruível (ADR-0022).

## CAs (US6b)
CA1 (`ContractCreated`+contractorRef → +1) · CA2 (mesmo `eventId` 2x → +1, idempotência) · CA3 (`Ended`/`Cancelled` → −1) · CA4 (sem contractorRef → no-op).

## Escopo (anti-padrão #4)
Somente `par_*` + worker. NÃO tocar `ctr_*` (produtor é a US6a, já feita).
